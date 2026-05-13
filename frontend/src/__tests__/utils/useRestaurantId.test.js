/**
 * Tests for getSubdomain() — custom domain resolver-key extraction.
 *
 * Verifies the contract documented in useRestaurantId.js:
 *   - localhost / 127.0.0.1                       → null
 *   - *.preview.emergentagent.com                 → null
 *   - mygenie.online (bare base)                  → null
 *   - <system>.mygenie.online (admin/api/cdn/app) → null
 *   - hyatt.mygenie.online                        → "hyatt.mygenie.online"
 *   - sattivikdelights.com                        → "sattivikdelights.com"
 *   - www.sattivikdelights.com                    → "sattivikdelights.com"
 *   - unknowncustomdomain.com                     → "unknowncustomdomain.com"
 */

import { getSubdomain } from '../../utils/useRestaurantId';

const setHostname = (hostname) => {
  // jsdom keeps a writable window.location on the URL object
  delete window.location;
  window.location = { hostname };
};

describe('getSubdomain() — hostname → resolver key', () => {
  afterEach(() => {
    delete window.location;
    window.location = { hostname: 'localhost' };
  });

  test('localhost returns null (dev fallback path)', () => {
    setHostname('localhost');
    expect(getSubdomain()).toBeNull();
  });

  test('127.0.0.1 returns null', () => {
    setHostname('127.0.0.1');
    expect(getSubdomain()).toBeNull();
  });

  test('foo.localhost returns null (dev-only multi-tenant local hostnames)', () => {
    setHostname('foo.localhost');
    expect(getSubdomain()).toBeNull();
  });

  test('Emergent preview host returns null (build/preview, not a tenant)', () => {
    setHostname('deployment-prep-11.preview.emergentagent.com');
    expect(getSubdomain()).toBeNull();
  });

  test('bare mygenie.online returns null (no tenant subdomain)', () => {
    setHostname('mygenie.online');
    expect(getSubdomain()).toBeNull();
  });

  test('www.mygenie.online returns null (www stripped → bare base)', () => {
    setHostname('www.mygenie.online');
    expect(getSubdomain()).toBeNull();
  });

  test.each(['admin', 'api', 'cdn', 'app'])(
    '%s.mygenie.online returns null (system subdomain)',
    (label) => {
      setHostname(`${label}.mygenie.online`);
      expect(getSubdomain()).toBeNull();
    }
  );

  test('hyatt.mygenie.online returns full hostname (existing tenant subdomain behaviour)', () => {
    setHostname('hyatt.mygenie.online');
    expect(getSubdomain()).toBe('hyatt.mygenie.online');
  });

  test('preprod.mygenie.online returns full hostname (treated like any tenant subdomain)', () => {
    setHostname('preprod.mygenie.online');
    expect(getSubdomain()).toBe('preprod.mygenie.online');
  });

  test('sattivikdelights.com returns full hostname (custom domain)', () => {
    setHostname('sattivikdelights.com');
    expect(getSubdomain()).toBe('sattivikdelights.com');
  });

  test('www.sattivikdelights.com is normalised to sattivikdelights.com', () => {
    setHostname('www.sattivikdelights.com');
    expect(getSubdomain()).toBe('sattivikdelights.com');
  });

  test('uppercase hostname is normalised to lowercase', () => {
    setHostname('SattivikDelights.COM');
    expect(getSubdomain()).toBe('sattivikdelights.com');
  });

  test('unknown custom domain returns full hostname (will be sent to backend, not 478)', () => {
    setHostname('unknowncustomdomain.com');
    expect(getSubdomain()).toBe('unknowncustomdomain.com');
  });

  test('deeper custom domain (sub.tenant.com) returns full hostname', () => {
    setHostname('shop.example.com');
    expect(getSubdomain()).toBe('shop.example.com');
  });

  test('www.shop.example.com strips a single leading www', () => {
    setHostname('www.shop.example.com');
    expect(getSubdomain()).toBe('shop.example.com');
  });
});
