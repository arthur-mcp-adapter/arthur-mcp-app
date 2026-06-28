import { Body, Controller, Get, HttpCode, Param, Post, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { OAuthService } from './oauth.service';

function escapeHtml(s: string): string {
  return (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function loginPage(serverId: string, clientId: string, redirectUri: string, state: string, error?: string): string {
  const e = escapeHtml;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Sign in — MCP Server</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f0f2f5; }
    .card { background: #fff; padding: 2rem; border-radius: 10px; box-shadow: 0 4px 16px rgba(0,0,0,.1); width: 340px; }
    h2 { margin: 0 0 .5rem; font-size: 1.25rem; }
    p.sub { margin: 0 0 1.5rem; font-size: .875rem; color: #666; }
    label { display: block; font-size: .875rem; font-weight: 500; margin-bottom: .375rem; }
    input[type=text], input[type=password] { width: 100%; padding: .5rem .75rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 1rem; margin-bottom: 1rem; outline: none; }
    input:focus { border-color: #2563eb; box-shadow: 0 0 0 2px rgba(37,99,235,.2); }
    button { width: 100%; padding: .625rem; background: #2563eb; color: #fff; border: none; border-radius: 6px; font-size: 1rem; font-weight: 500; cursor: pointer; }
    button:hover { background: #1d4ed8; }
    .error { background: #fef2f2; border: 1px solid #fca5a5; color: #dc2626; padding: .75rem; border-radius: 6px; font-size: .875rem; margin-bottom: 1rem; }
  </style>
</head>
<body>
<div class="card">
  <h2>Sign in to MCP Server</h2>
  <p class="sub">A third-party app is requesting access.</p>
  ${error ? `<div class="error">${e(error)}</div>` : ''}
  <form method="POST" action="/oauth/server/${e(serverId)}/authorize">
    <input type="hidden" name="client_id" value="${e(clientId)}" />
    <input type="hidden" name="redirect_uri" value="${e(redirectUri)}" />
    <input type="hidden" name="state" value="${e(state)}" />
    <label for="username">Username</label>
    <input type="text" id="username" name="username" required autofocus />
    <label for="password">Password</label>
    <input type="password" id="password" name="password" required />
    <button type="submit">Sign in</button>
  </form>
</div>
</body>
</html>`;
}

@Controller()
export class OAuthController {
  constructor(private readonly oauthService: OAuthService) {}

  /** OAuth 2.0 discovery — lets clients auto-fill auth/token URLs */
  @Get('.well-known/oauth-authorization-server')
  discovery(@Req() req: Request) {
    const base = `${req.protocol}://${req.get('host')}`;
    return {
      issuer: base,
      authorization_endpoint: `${base}/oauth/server/{serverId}/authorize`,
      token_endpoint: `${base}/oauth/server/{serverId}/token`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code'],
      token_endpoint_auth_methods_supported: ['client_secret_post', 'none'],
    };
  }

  @Get('oauth/server/:serverId/authorize')
  async showLoginForm(
    @Param('serverId') serverId: string,
    @Query('client_id') clientId: string,
    @Query('redirect_uri') redirectUri: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    try {
      await this.oauthService.validateClient(serverId, clientId);
    } catch {
      return res.status(400).send('Invalid client_id or OAuth not configured for this server.');
    }
    res.setHeader('Content-Type', 'text/html');
    res.send(loginPage(serverId, clientId, redirectUri, state ?? ''));
  }

  @Post('oauth/server/:serverId/authorize')
  @HttpCode(200)
  async handleLogin(
    @Param('serverId') serverId: string,
    @Body('username') username: string,
    @Body('password') password: string,
    @Body('client_id') clientId: string,
    @Body('redirect_uri') redirectUri: string,
    @Body('state') state: string,
    @Res() res: Response,
  ) {
    const user = await this.oauthService.validateUser(username, password);
    if (!user) {
      res.setHeader('Content-Type', 'text/html');
      return res.status(401).send(loginPage(serverId, clientId, redirectUri, state ?? '', 'Incorrect username or password.'));
    }

    const code = this.oauthService.createCode(user._id, user.username, user.role, serverId, clientId, redirectUri, state ?? '');
    const url = new URL(redirectUri);
    url.searchParams.set('code', code);
    if (state) url.searchParams.set('state', state);
    res.redirect(url.toString());
  }

  @Post('oauth/server/:serverId/token')
  @HttpCode(200)
  async token(
    @Param('serverId') serverId: string,
    @Body('grant_type') grantType: string,
    @Body('code') code: string,
    @Body('client_id') clientId: string,
    @Body('client_secret') clientSecret: string,
    @Body('redirect_uri') redirectUri: string,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'application/json');

    if (grantType !== 'authorization_code') {
      return res.status(400).json({ error: 'unsupported_grant_type' });
    }

    try {
      await this.oauthService.validateClient(serverId, clientId, clientSecret);
    } catch {
      return res.status(401).json({ error: 'invalid_client' });
    }

    const entry = this.oauthService.consumeCode(code, serverId, clientId, redirectUri);
    if (!entry) {
      return res.status(400).json({ error: 'invalid_grant' });
    }

    const accessToken = await this.oauthService.issueToken(entry.userId, entry.username, entry.role, serverId);
    return res.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 86400,
    });
  }
}
