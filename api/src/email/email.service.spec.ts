import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { EmailService } from './email.service';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}));

describe('EmailService', () => {
  const config = (values: Record<string, unknown>): ConfigService => ({
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('is not configured when SMTP credentials are missing and does not send', async () => {
    const service = new EmailService(config({}));

    await expect(service.send({ to: 'user@example.com', subject: 'Hi', html: '<p>Hi</p>' })).resolves.toBe(false);
    expect(service.isConfigured).toBe(false);
    expect(nodemailer.createTransport).not.toHaveBeenCalled();
  });

  it('creates a transporter and sends email with configured from address', async () => {
    const sendMail = jest.fn().mockResolvedValue(undefined);
    jest.mocked(nodemailer.createTransport).mockReturnValue({ sendMail } as any);

    const service = new EmailService(config({
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: 465,
      SMTP_USER: 'mailer',
      SMTP_PASS: 'secret',
      SMTP_FROM: 'Arthur <noreply@example.com>',
    }));

    await expect(service.send({ to: 'user@example.com', subject: 'Hi', html: '<p>Hi</p>' })).resolves.toBe(true);
    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      host: 'smtp.example.com',
      port: 465,
      secure: true,
      auth: { user: 'mailer', pass: 'secret' },
    });
    expect(sendMail).toHaveBeenCalledWith({
      from: 'Arthur <noreply@example.com>',
      to: 'user@example.com',
      subject: 'Hi',
      html: '<p>Hi</p>',
    });
  });

  it('returns false when sending fails', async () => {
    jest.mocked(nodemailer.createTransport).mockReturnValue({
      sendMail: jest.fn().mockRejectedValue(new Error('SMTP down')),
    } as any);

    const service = new EmailService(config({
      SMTP_HOST: 'smtp.example.com',
      SMTP_USER: 'mailer',
      SMTP_PASS: 'secret',
    }));

    await expect(service.send({ to: 'user@example.com', subject: 'Hi', html: '<p>Hi</p>' })).resolves.toBe(false);
  });

  it('builds digest and alert HTML with optional sections', () => {
    const service = new EmailService(config({}));

    expect(service.buildWeeklyDigest({
      serverName: 'Payments',
      totalCalls: 10,
      errors: 1,
      successRate: 90,
      topTools: [{ name: 'list_payments', count: 7 }],
      periodLabel: 'Jan 1 - Jan 7',
    })).toContain('list_payments');

    expect(service.buildWeeklyDigest({
      serverName: 'Payments',
      totalCalls: 0,
      errors: 0,
      successRate: 100,
      topTools: [],
      periodLabel: 'Jan 1 - Jan 7',
    })).not.toContain('Most used tools');

    expect(service.buildAlertEmail({
      serverName: 'Payments',
      errorRate: 50,
      threshold: 20,
      recentErrors: [{ toolName: 'charge_card', time: '10:00' }],
      projectUrl: 'https://app.example.com/servers/server-1',
    })).toContain('Unknown error');
  });
});
