import express, { Request, Response, Router } from 'express';
import crypto from 'node:crypto';
import axios from 'axios';

import { gotoAuthClient } from './goto-config';
import { createSDPOffer } from '@/common/utils/createWebRTC';

const READ_LINES_SCOPE = 'users.v1.lines.read';
const CLICK_TO_CALL_SCOPE = 'calls.v2.initiate';
const WEBRTC_WRITE = 'webrtc.v1.write';

export const gotoRouter: Router = (() => {
  const router = express.Router();

  router.get('/', async (_req: Request, res: Response) => {
    const expectedStateForAuthorizationCode = crypto.randomBytes(15).toString('hex');

    const authorizationUrl = gotoAuthClient.authorizeURL({
      redirect_uri: process.env.OAUTH_REDIRECT_URI,
      scope: [CLICK_TO_CALL_SCOPE, READ_LINES_SCOPE, WEBRTC_WRITE],
      state: expectedStateForAuthorizationCode,
    });

    console.log('Open in browser to send a SMS: ', authorizationUrl);

    return res.status(200).send(authorizationUrl);
  });

  router.get('/code/:code', async (req: Request, res: Response) => {
    const authorizationCode = req.params.code;

    const tokenParams = {
      code: authorizationCode,
      redirect_uri: process.env.OAUTH_REDIRECT_URI!,
      scope: [CLICK_TO_CALL_SCOPE, READ_LINES_SCOPE, WEBRTC_WRITE],
    };

    let tokenResponse = null;
    try {
      tokenResponse = await gotoAuthClient.getToken(tokenParams);
    } catch (error: any) {
      console.log('Access Token Error', error.message);
      return;
    }

    const accessToken = tokenResponse.token.access_token;

    return res.status(200).send(accessToken);
  });

  router.get('/lines', async (req: Request, res: Response) => {
    const token = req.headers['authorization'];

    const { data: lines } = await axios.get('https://api.goto.com/users/v1/lines', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const { items } = lines;

    return res.status(200).send(items[0]);
  });

  router.post('/call', async (req: Request, res: Response) => {
    const { body } = req;
    const token = req.headers['authorization'];

    const options = {
      dialString: body.dialString,
      from: { lineId: body.lineId },
      autoAnswer: true,
    };

    const { data, status } = await axios.post('https://api.goto.com/calls/v2/calls', options, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return res.status(status).send(data);
  });

  router.post('/call-2', async (req: Request, res: Response) => {
    const { body } = req;
    const token = req.headers['authorization'];

    const { data, status } = await axios.post(
      'https://webrtc.jive.com/web-calls/v1/calls',
      {
        deviceId: body.deviceId,
        organizationId: body.organizationId,
        extensionNumber: body.number,
        dialString: body.dialString,
        inCallChannelId: body.inCallChannelId,
        sdp: body.sdp,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
      }
    );

    return res.status(status).send(data);
  });

  router.post('/call/webrtc', async (req: Request, res: Response) => {
    // const { body } = req;
    const token = req.headers['authorization'];

    try {
      const { data: notification } = await axios.post(
        'https://api.goto.com/notification-channel/v1/channels/f652d411-d4ab-4178-bbfc-a10d2fc1052f@email.webhook.site',
        {
          channelType: 'Webhook',
          webhookChannelData: {
            webhook: {
              url: 'https://webhook.site/f652d411-d4ab-4178-bbfc-a10d2fc1052f',
            },
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'content-type': 'application/json',
          },
        }
      );

      const { data: device } = await axios.post(
        'https://webrtc.jive.com/web-calls/v1/devices',
        {
          clientInformation: {
            // TODO: Verificar se não devemos mudar
            deviceId: '1234567809012343455',
            appId: 'INTEGRATOR_APP_ID',
            appVersion: '2.3.1',
            platform: 'INTEGRATOR',
          },
          callbackReference: {
            incomingCallChannelId: `${notification.channelId}`,
            sessionManagementChannelId: `${notification.channelId}`,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'content-type': 'application/json',
          },
        }
      );

      // const { data: lines } = await axios.get('https://api.goto.com/users/v1/lines', {
      //   headers: {
      //     Authorization: `Bearer ${token}`,
      //   },
      // });

      const { data: extensions } = await axios.post(
        `https://webrtc.jive.com/web-calls/v1/devices/${device.clientInformation.deviceId}/extensions`,
        {
          organizationId: '46f8eafb-c85e-40ed-92f8-bf0ebf96fcad',
          extensions: [
            {
              number: '1013',
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'content-type': 'application/json',
          },
        }
      );

      return res.status(200).send({ notification, device, extensions });
    } catch (e) {
      console.log(e);
      return res.status(503).send(e);
    }
  });

  router.post('/generate-sdp', async (req, res) => {
    try {
      const sdpOffer = await createSDPOffer();
      res.json({ sdp: sdpOffer });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Unknown error' });
    }
  });

  return router;
})();
