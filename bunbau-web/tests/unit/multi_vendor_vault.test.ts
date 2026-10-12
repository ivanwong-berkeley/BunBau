import { describe, it, expect } from 'vitest';
import { MultiVendorVault, VendorConfig } from '../../src/lib/models';
import { maskApiKey } from '../../src/lib/utils/cryptoVault';

describe('Multi-Vendor Vault State & Dynamic Switching', () => {
  it('manages separate encrypted credentials and models for Gemini and Anthropic', () => {
    const vault: MultiVendorVault = {
      activeVendor: 'Gemini',
      vendors: {
        Gemini: {
          encryptedKey: 'salt1:iv1:cipher1',
          maskedKey: 'AIzaSy••••••••uZ_Q',
          validated: true,
          tier1Model: 'gemini-2.5-pro',
          tier2Model: 'gemini-2.5-flash',
          availableModels: ['gemini-2.5-flash', 'gemini-2.5-pro'],
          updatedAt: '2026-10-06T12:00:00Z',
        },
        Anthropic: {
          encryptedKey: 'salt2:iv2:cipher2',
          maskedKey: 'sk-ant••••••••A9f2',
          validated: true,
          tier1Model: 'claude-3-5-sonnet-20241022',
          tier2Model: 'claude-3-5-haiku-20241022',
          availableModels: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
          updatedAt: '2026-10-06T14:00:00Z',
        },
      },
    };

    // Switching active vendor to Anthropic preserves Gemini settings untouched
    const switchedVault: MultiVendorVault = {
      ...vault,
      activeVendor: 'Anthropic',
    };

    expect(switchedVault.activeVendor).toBe('Anthropic');
    expect(switchedVault.vendors.Anthropic?.tier1Model).toBe('claude-3-5-sonnet-20241022');
    expect(switchedVault.vendors.Anthropic?.maskedKey).toBe('sk-ant••••••••A9f2');

    // Gemini settings remain intact without re-typing
    expect(switchedVault.vendors.Gemini?.tier1Model).toBe('gemini-2.5-pro');
    expect(switchedVault.vendors.Gemini?.maskedKey).toBe('AIzaSy••••••••uZ_Q');
  });

  it('correctly reports whether an active vendor key is configured', () => {
    const emptyVault: MultiVendorVault = {
      activeVendor: 'Anthropic',
      vendors: {},
    };

    const hasActiveKey = !!emptyVault.vendors[emptyVault.activeVendor]?.validated;
    expect(hasActiveKey).toBe(false);

    const configuredVault: MultiVendorVault = {
      activeVendor: 'Anthropic',
      vendors: {
        Anthropic: {
          encryptedKey: 'enc',
          maskedKey: maskApiKey('sk-ant-1234567890'),
          validated: true,
          tier1Model: 'claude-3-5-sonnet-20241022',
          tier2Model: 'claude-3-5-haiku-20241022',
          availableModels: ['claude-3-5-sonnet-20241022'],
          updatedAt: new Date().toISOString(),
        },
      },
    };

    const activeConfig = configuredVault.vendors[configuredVault.activeVendor];
    expect(activeConfig?.validated).toBe(true);
    expect(activeConfig?.tier1Model).toBe('claude-3-5-sonnet-20241022');
  });
});
