/**
 * Rules Tab - Domain exceptions + IP tracking
 */

import React, { useState, useEffect } from 'react';
import browser from 'webextension-polyfill';
import type { ContainerSettings, IPDatabase } from '@/types';

interface WhitelistTabProps {
  settings: ContainerSettings;
  onSaveSettings: (updates: Partial<ContainerSettings>) => void;
}

export default function WhitelistTab({ settings, onSaveSettings }: WhitelistTabProps) {
  const [newDomain, setNewDomain] = useState('');
  const [newTracked, setNewTracked] = useState('');
  const [ipData, setIpData] = useState<IPDatabase | null>(null);
  const [activeSection, setActiveSection] = useState<'whitelist' | 'iptrack'>('whitelist');
  const rules = settings.domainRules || {};
  const domains = Object.keys(rules);

  // Load IP database
  useEffect(() => {
    async function loadIP() {
      try {
        const data = await browser.runtime.sendMessage({ type: 'GET_IP_DATABASE' }) as IPDatabase;
        setIpData(data);
      } catch {}
    }
    loadIP();
  }, []);

  const addRule = () => {
    const domain = newDomain.trim().toLowerCase();
    if (!domain || rules[domain]) return;
    onSaveSettings({ domainRules: { ...rules, [domain]: { enabled: false } } });
    setNewDomain('');
  };

  const removeRule = (domain: string) => {
    const updated = { ...rules };
    delete updated[domain];
    onSaveSettings({ domainRules: updated });
  };

  const toggleRule = (domain: string) => {
    const current = rules[domain] || {};
    onSaveSettings({ domainRules: { ...rules, [domain]: { ...current, enabled: !(current.enabled ?? true) } } });
  };

  const addTrackedDomain = async () => {
    const domain = newTracked.trim().toLowerCase();
    if (!domain) return;
    try {
      await browser.runtime.sendMessage({ type: 'ADD_TRACKED_DOMAIN', domain });
      const data = await browser.runtime.sendMessage({ type: 'GET_IP_DATABASE' }) as IPDatabase;
      setIpData(data);
      setNewTracked('');
    } catch {}
  };

  const removeTrackedDomain = async (domain: string) => {
    try {
      await browser.runtime.sendMessage({ type: 'REMOVE_TRACKED_DOMAIN', domain });
      const data = await browser.runtime.sendMessage({ type: 'GET_IP_DATABASE' }) as IPDatabase;
      setIpData(data);
    } catch {}
  };

  const clearIPRecord = async (ip: string) => {
    try {
      await browser.runtime.sendMessage({ type: 'CLEAR_IP_RECORD', ip });
      const data = await browser.runtime.sendMessage({ type: 'GET_IP_DATABASE' }) as IPDatabase;
      setIpData(data);
    } catch {}
  };

  const trackedDomains = ipData?.trackedDomains || [];
  const ipRecords = Object.values(ipData?.ipRecords || {});

  return (
    <div className="space-y-3">
      {/* Section toggle */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--bg-elevated)' }}>
        <button onClick={() => setActiveSection('whitelist')}
          className={`subtab flex-1 text-center ${activeSection === 'whitelist' ? 'active' : ''}`}>
          Domain Rules
        </button>
        <button onClick={() => setActiveSection('iptrack')}
          className={`subtab flex-1 text-center ${activeSection === 'iptrack' ? 'active' : ''}`}>
          IP Tracking
        </button>
      </div>

      {activeSection === 'whitelist' && (
        <>
          {/* Add domain */}
          <div className="card">
            <div className="section-label">Add Domain Exception</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input className="input" style={{ flex: 1 }} placeholder="example.com"
                value={newDomain} onChange={(e) => setNewDomain(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addRule()} />
              <button className="btn btn-primary" onClick={addRule}>Add</button>
            </div>
            <div className="row-desc" style={{ marginTop: '6px' }}>
              Protection is disabled for whitelisted domains.
            </div>
          </div>

          {/* Rule list */}
          <div className="card">
            <div className="section-label">Domain Rules ({domains.length})</div>
            {domains.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>
                No domain rules configured
              </div>
            ) : (
              <div>
                {domains.map((domain) => {
                  const rule = rules[domain] || {};
                  const isDisabled = rule.enabled === false;
                  return (
                    <div key={domain} className="row">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="row-label" style={{ fontFamily: 'monospace', fontSize: '11px' }}>{domain}</div>
                        <div className="row-desc">{isDisabled ? 'Protection disabled' : 'Protection enabled'}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className={`toggle ${!isDisabled ? 'on' : ''}`} onClick={() => toggleRule(domain)} />
                        <button onClick={() => removeRule(domain)}
                          style={{ color: 'var(--red)', fontSize: '16px', padding: '0 4px', background: 'none', border: 'none', cursor: 'pointer' }}>&times;</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {activeSection === 'iptrack' && (
        <>
          {/* Add tracked domain */}
          <div className="card">
            <div className="section-label">Track Domain IPs</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input className="input" style={{ flex: 1 }} placeholder="bank.com"
                value={newTracked} onChange={(e) => setNewTracked(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTrackedDomain()} />
              <button className="btn btn-primary" onClick={addTrackedDomain}>Track</button>
            </div>
            <div className="row-desc" style={{ marginTop: '6px' }}>
              Before visiting tracked domains, the IP is resolved and checked against other containers. If the same IP was used in another container, you'll be warned to prevent identity linkage.
            </div>
          </div>

          {/* Tracked domains */}
          <div className="card">
            <div className="section-label">Tracked Domains ({trackedDomains.length})</div>
            {trackedDomains.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>
                No domains tracked. Add domains you want IP isolation for.
              </div>
            ) : (
              <div>
                {trackedDomains.map((domain) => (
                  <div key={domain} className="row">
                    <div className="row-label" style={{ fontFamily: 'monospace', fontSize: '11px' }}>{domain}</div>
                    <button onClick={() => removeTrackedDomain(domain)}
                      style={{ color: 'var(--red)', fontSize: '16px', padding: '0 4px', background: 'none', border: 'none', cursor: 'pointer' }}>&times;</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* IP Isolation Settings */}
          <div className="card space-y-0">
            <div className="section-label">IP Isolation Settings</div>
            <div className="row">
              <div style={{ flex: 1 }}>
                <div className="row-label">Enable IP Tracking</div>
                <div className="row-desc">Monitor IPs across containers</div>
              </div>
              <div className={`toggle ${ipData?.settings?.enabled ? 'on' : ''}`}
                onClick={async () => {
                  try {
                    await browser.runtime.sendMessage({ type: 'UPDATE_IP_SETTINGS', settings: { ...ipData?.settings, enabled: !ipData?.settings?.enabled } });
                    const data = await browser.runtime.sendMessage({ type: 'GET_IP_DATABASE' }) as IPDatabase;
                    setIpData(data);
                  } catch {}
                }} />
            </div>
            <div className="row">
              <div style={{ flex: 1 }}>
                <div className="row-label">Warn Only (don't block)</div>
                <div className="row-desc">Show notification instead of blocking</div>
              </div>
              <div className={`toggle ${ipData?.settings?.warnOnly ? 'on' : ''}`}
                onClick={async () => {
                  try {
                    await browser.runtime.sendMessage({ type: 'UPDATE_IP_SETTINGS', settings: { ...ipData?.settings, warnOnly: !ipData?.settings?.warnOnly } });
                    const data = await browser.runtime.sendMessage({ type: 'GET_IP_DATABASE' }) as IPDatabase;
                    setIpData(data);
                  } catch {}
                }} />
            </div>
            <div className="row">
              <div style={{ flex: 1 }}>
                <div className="row-label">Track Local IPs</div>
                <div className="row-desc">Include 192.168.x.x, 10.x.x.x</div>
              </div>
              <div className={`toggle ${ipData?.settings?.trackLocalIPs ? 'on' : ''}`}
                onClick={async () => {
                  try {
                    await browser.runtime.sendMessage({ type: 'UPDATE_IP_SETTINGS', settings: { ...ipData?.settings, trackLocalIPs: !ipData?.settings?.trackLocalIPs } });
                    const data = await browser.runtime.sendMessage({ type: 'GET_IP_DATABASE' }) as IPDatabase;
                    setIpData(data);
                  } catch {}
                }} />
            </div>
            <div className="row">
              <div style={{ flex: 1 }}>
                <div className="row-label">Auto-protect new containers</div>
                <div className="row-desc">Rotate fingerprint if new container is too similar</div>
              </div>
              <div className={`toggle ${ipData?.settings?.autoProtectNewContainers ? 'on' : ''}`}
                onClick={async () => {
                  try {
                    await browser.runtime.sendMessage({ type: 'UPDATE_IP_SETTINGS', settings: { ...ipData?.settings, autoProtectNewContainers: !ipData?.settings?.autoProtectNewContainers } });
                    const data = await browser.runtime.sendMessage({ type: 'GET_IP_DATABASE' }) as IPDatabase;
                    setIpData(data);
                  } catch {}
                }} />
            </div>
            <div className="row">
              <div style={{ flex: 1 }}>
                <div className="row-label">Similarity threshold</div>
                <div className="row-desc">Max allowed similarity before auto-rotation</div>
              </div>
              <select
                className="input"
                style={{ width: '80px', padding: '4px 8px', fontSize: '12px' }}
                value={ipData?.settings?.similarityThreshold ?? 30}
                onChange={async (e) => {
                  try {
                    await browser.runtime.sendMessage({ type: 'UPDATE_IP_SETTINGS', settings: { ...ipData?.settings, similarityThreshold: Number(e.target.value) } });
                    const data = await browser.runtime.sendMessage({ type: 'GET_IP_DATABASE' }) as IPDatabase;
                    setIpData(data);
                  } catch {}
                }}>
                <option value={20}>20%</option>
                <option value={30}>30%</option>
                <option value={40}>40%</option>
                <option value={50}>50%</option>
              </select>
            </div>
          </div>

          {/* IP Exceptions */}
          {(ipData?.exceptions?.length || 0) > 0 && (
            <div className="card">
              <div className="section-label">IP Exceptions ({ipData?.exceptions?.length})</div>
              {ipData?.exceptions?.map((ip) => (
                <div key={ip} className="row">
                  <div className="row-label" style={{ fontFamily: 'monospace', fontSize: '11px' }}>{ip}</div>
                  <button onClick={async () => {
                    try {
                      await browser.runtime.sendMessage({ type: 'REMOVE_IP_EXCEPTION', ip });
                      const data = await browser.runtime.sendMessage({ type: 'GET_IP_DATABASE' }) as IPDatabase;
                      setIpData(data);
                    } catch {}
                  }} style={{ color: 'var(--red)', fontSize: '16px', padding: '0 4px', background: 'none', border: 'none', cursor: 'pointer' }}>&times;</button>
                </div>
              ))}
            </div>
          )}

          {/* IP records */}
          {ipRecords.length > 0 && (
            <div className="card">
              <div className="section-label">IP Records ({ipRecords.length})</div>
              <div>
                {ipRecords.map((record) => (
                  <div key={record.ip} className="row">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="row-label" style={{ fontFamily: 'monospace', fontSize: '11px' }}>{record.ip}</div>
                      <div className="row-desc">
                        Container: {record.containerName} | Visits: {record.accessCount} | {new Date(record.lastAccessed).toLocaleDateString()}
                      </div>
                    </div>
                    <button onClick={() => clearIPRecord(record.ip)}
                      style={{ color: 'var(--red)', fontSize: '16px', padding: '0 4px', background: 'none', border: 'none', cursor: 'pointer' }}>&times;</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
