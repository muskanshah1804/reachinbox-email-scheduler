import { Router } from 'express';
import crypto from 'crypto';
import { prisma } from '../config/prisma';
import { env } from '../config/env';

const router = Router();

const oauthStates = new Set<string>();

// Start Slack OAuth
router.get('/connect', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');

  oauthStates.add(state);

  const params = new URLSearchParams({
    client_id: env.slackClientId,
    scope: 'incoming-webhook',
    redirect_uri: env.slackRedirectUri,
    state,
  });

  res.redirect(
    `https://slack.com/oauth/v2/authorize?${params.toString()}`
  );
});

// Slack OAuth callback
router.get('/callback', async (req, res) => {
  try {
    const code = String(req.query.code || '');
    const state = String(req.query.state || '');
    const error = String(req.query.error || '');

    if (error) {
      return res.status(400).send(`Slack OAuth failed: ${error}`);
    }

    if (!code || !state || !oauthStates.has(state)) {
      return res.status(400).send('Invalid Slack OAuth state');
    }

    oauthStates.delete(state);

    const response = await fetch(
      'https://slack.com/api/oauth.v2.access',
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: env.slackClientId,
          client_secret: env.slackClientSecret,
          code,
          redirect_uri: env.slackRedirectUri,
        }),
      }
    );

    const data: any = await response.json();

    if (!data.ok) {
      console.error('Slack OAuth error:', data);

      return res.status(400).send(
        `Slack OAuth failed: ${
          data.error || 'Unknown error'
        }`
      );
    }

    const webhookUrl = data.incoming_webhook?.url;

    if (!webhookUrl) {
      return res.status(400).send(
        'Slack connected, but no incoming webhook was returned.'
      );
    }

    await prisma.slackConnection.upsert({
      where: {
        tenantId: 'demo',
      },
      create: {
        tenantId: 'demo',
        webhookUrl,
      },
      update: {
        webhookUrl,
      },
    });

    console.log('Slack OAuth connected successfully');

    res.redirect(
      `${env.frontendUrl}/?slack=connected`
    );
  } catch (error) {
    console.error('Slack OAuth callback error:', error);

    res.status(500).send(
      'Slack OAuth connection failed'
    );
  }
});

// Existing manual connection endpoint
router.post('/connect-webhook', async (req, res) => {
  try {
    const {
      tenantId = 'demo',
      webhookUrl,
    } = req.body;

    if (!webhookUrl) {
      return res.status(400).json({
        error: 'webhookUrl required',
      });
    }

    const connection =
      await prisma.slackConnection.upsert({
        where: { tenantId },
        create: {
          tenantId,
          webhookUrl,
        },
        update: {
          webhookUrl,
        },
      });

    res.json({
      connected: true,
      id: connection.id,
    });
  } catch (error: any) {
    res.status(500).json({
      error: error?.message || 'Slack connection failed',
    });
  }
});

// Check Slack status
router.get('/status', async (req, res) => {
  try {
    const tenantId = String(
      req.query.tenantId || 'demo'
    );

    const connection =
      await prisma.slackConnection.findUnique({
        where: { tenantId },
      });

    res.json({
      connected: !!connection,
    });
  } catch (error: any) {
    res.status(500).json({
      error: error?.message || 'Failed to check Slack status',
    });
  }
});

// Disconnect Slack
router.delete('/disconnect', async (req, res) => {
  try {
    const tenantId = String(
      req.query.tenantId || 'demo'
    );

    await prisma.slackConnection.deleteMany({
      where: { tenantId },
    });

    res.json({
      connected: false,
    });
  } catch (error: any) {
    res.status(500).json({
      error: error?.message || 'Failed to disconnect Slack',
    });
  }
});

export default router;