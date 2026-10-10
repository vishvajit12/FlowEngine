const crypto = require('crypto');
const User = require('../models/User');
const config = require('../config/env');
const signToken = require('../utils/signToken');
const { getProvider } = require('../services/oauthProviders');

const STATE_COOKIE = 'oauth_state';
const COOKIE_PATH = '/api/auth/oauth';
const redirectUri = (name) => `${config.oauth.apiUrl}/api/auth/oauth/${name}/callback`;
const failRedirect = (res, msg) =>
  res.redirect(`${config.oauth.frontendUrl}/login?error=${encodeURIComponent(msg)}`);

function startOAuth(req, res) {
  const provider = getProvider(req.params.provider);
  if (!provider) return failRedirect(res, 'This sign-in method is not available');

  const state = crypto.randomBytes(24).toString('hex');
  res.cookie(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax', // must be Lax (not Strict): the provider's redirect back is a cross-site navigation
    secure: config.nodeEnv === 'production',
    maxAge: 10 * 60 * 1000,
    path: COOKIE_PATH,
  });

  const params = new URLSearchParams({
    client_id: provider.clientId,
    redirect_uri: redirectUri(req.params.provider),
    response_type: 'code',
    scope: provider.scope,
    state,
  });
  res.redirect(`${provider.authUrl}?${params}`);
}

async function oauthCallback(req, res) {
  try {
    const name = req.params.provider;
    const provider = getProvider(name);
    if (!provider) return failRedirect(res, 'This sign-in method is not available');

    const { code, state, error } = req.query;
    const expectedState = req.cookies?.[STATE_COOKIE];
    res.clearCookie(STATE_COOKIE, { path: COOKIE_PATH });

    if (error) return failRedirect(res, 'Sign-in was cancelled');
    if (!code || !state || !expectedState || state !== expectedState) {
      return failRedirect(res, 'Invalid sign-in state, please try again');
    }

    const tokenRes = await fetch(provider.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({
        client_id: provider.clientId,
        client_secret: provider.clientSecret,
        code,
        redirect_uri: redirectUri(name),
        grant_type: 'authorization_code',
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) return failRedirect(res, 'Could not complete sign-in');

    const profile = await provider.fetchProfile(tokenData.access_token);
    if (!profile.email || !profile.emailVerified) {
      return failRedirect(res, 'Your account has no verified email address');
    }
    const email = profile.email.toLowerCase();

    let user = await User.findOne({ [provider.idField]: profile.providerId });
    if (!user) {
      const existing = await User.findOne({ email });
      if (existing) {
        // Local signup doesn't verify emails, so never auto-link to a password
        // account (see "Security notes"). An OAuth-only account is safe to link.
        if (existing.passwordHash) {
          return failRedirect(res, 'An account with this email already exists. Sign in with your password.');
        }
        existing[provider.idField] = profile.providerId;
        await existing.save();
        user = existing;
      } else {
        user = await User.create({ name: profile.name, email, [provider.idField]: profile.providerId });
      }
    }

    res.redirect(`${config.oauth.frontendUrl}/oauth/callback#token=${signToken(user._id)}`);
  } catch (err) {
    console.error('[OAuth] callback error:', err.message);
    failRedirect(res, 'Sign-in failed, please try again');
  }
}

module.exports = { startOAuth, oauthCallback };