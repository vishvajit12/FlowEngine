const config = require('../config/env');

const providers = {
  google: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scope: 'openid email profile',
    idField: 'googleId',
    async fetchProfile(accessToken) {
      const res = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to fetch Google profile');
      const p = await res.json();
      return { providerId: p.sub, email: p.email, emailVerified: p.email_verified === true, name: p.name || p.email };
    },
  },
  github: {
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scope: 'read:user user:email',
    idField: 'githubId',
    async fetchProfile(accessToken) {
      const headers = {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'FlowEngine', // GitHub rejects requests without one
      };
      const [userRes, emailsRes] = await Promise.all([
        fetch('https://api.github.com/user', { headers }),
        fetch('https://api.github.com/user/emails', { headers }),
      ]);
      if (!userRes.ok || !emailsRes.ok) throw new Error('Failed to fetch GitHub profile');
      const u = await userRes.json();
      const emails = await emailsRes.json();
      const primary = emails.find((e) => e.primary && e.verified); // /user's email field can be null or unverified
      return { providerId: String(u.id), email: primary?.email, emailVerified: Boolean(primary), name: u.name || u.login };
    },
  },
};

// Returns null unless the provider exists AND its keys are configured.
function getProvider(name) {
  const base = providers[name];
  const creds = config.oauth[name];
  if (!base || !creds?.clientId || !creds?.clientSecret) return null;
  return { ...base, ...creds };
}

module.exports = { getProvider };