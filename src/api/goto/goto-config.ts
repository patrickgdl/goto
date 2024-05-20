import { AuthorizationCode } from "simple-oauth2";

const oauthConfig = {
    client: {
        id: process.env.OAUTH_CLIENT_ID!,
        secret: process.env.OAUTH_CLIENT_SECRET!
    },
    auth: {
        tokenHost: process.env.OAUTH_SERVICE_URL!
    }
};

export const gotoAuthClient = new AuthorizationCode(oauthConfig);