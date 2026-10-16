'use client';

import { useEffect, useState } from 'react';
import { formatNaira, type StoreSettings } from '@arkvolt/shared';
import { adminApi, ApiRequestError } from '@/lib/api';
import { PageHeader, Panel, Field, toFieldErrors, ErrorBanner, LoadingRows } from '@/components/admin/ui';

type Draft = {
  storeName: string;
  tagline: string;
  whatsappNumber: string;
  supportPhone: string;
  supportEmail: string;
  workshopAddress: string;
  workshopHours: string;
  announcement: string;
  announcementEnabled: boolean;
  bankDetails: string;
  deliveryFee: string;
  freeDeliveryThreshold: string;
  instagram: string;
  twitter: string;
};

const toDraft = (s: StoreSettings): Draft => ({
  storeName: s.storeName,
  tagline: s.tagline,
  whatsappNumber: s.whatsappNumber,
  supportPhone: s.supportPhone,
  supportEmail: s.supportEmail,
  workshopAddress: s.workshopAddress,
  workshopHours: s.workshopHours,
  announcement: s.announcement ?? '',
  announcementEnabled: s.announcementEnabled,
  bankDetails: s.bankDetails ?? '',
  deliveryFee: String(s.deliveryFeeKobo / 100),
  freeDeliveryThreshold: String(s.freeDeliveryThresholdKobo / 100),
  instagram: s.socials.find((x) => x.label === 'Instagram')?.href ?? '',
  twitter: s.socials.find((x) => x.label === 'X')?.href ?? '',
});

/** Storefront-wide configuration. Everything here is read by the public site. */
export default function AdminSettingsPage() {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminApi
      .settings()
      .then((s) => setDraft(toDraft(s)))
      .catch((err: Error) => setBanner(err.message));
  }, []);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: '' }));
    setSaved(false);
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setBanner(null);
    setErrors({});
    setSaved(false);

    const socials = [
      ...(draft.instagram ? [{ label: 'Instagram', href: draft.instagram }] : []),
      ...(draft.twitter ? [{ label: 'X', href: draft.twitter }] : []),
      {
        label: 'WhatsApp',
        href: `https://wa.me/${draft.whatsappNumber.replace(/\D/g, '')}`,
      },
    ];

    try {
      await adminApi.saveSettings({
        storeName: draft.storeName,
        tagline: draft.tagline,
        whatsappNumber: draft.whatsappNumber,
        supportPhone: draft.supportPhone,
        supportEmail: draft.supportEmail,
        workshopAddress: draft.workshopAddress,
        workshopHours: draft.workshopHours,
        announcement: draft.announcement,
        announcementEnabled: draft.announcementEnabled,
        bankDetails: draft.bankDetails,
        deliveryFee: Number(draft.deliveryFee || 0),
        freeDeliveryThreshold: Number(draft.freeDeliveryThreshold || 0),
        socials,
      });
      setSaved(true);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setErrors(toFieldErrors(err));
        setBanner(err.message);
      } else {
        setBanner('Could not save settings.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (!draft) {
    return (
      <>
        <PageHeader title="Settings" />
        {banner ? <ErrorBanner message={banner} /> : <LoadingRows rows={6} />}
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Storefront-wide values — the WhatsApp line orders are routed to, contact details, delivery pricing and the announcement bar."
        actions={
          <button type="button" onClick={() => void save()} disabled={saving} className="btn-primary btn-sm">
            {saving ? 'Saving…' : 'Save settings'}
          </button>
        }
      />

      <div className="px-5 py-8 lg:px-8">
        {banner && <div className="mb-6"><ErrorBanner message={banner} /></div>}
        {saved && (
          <div className="mb-6 border border-jade/40 bg-jade/[0.04] p-4" role="status">
            <p className="text-[13px] text-chalk">
              Saved. The storefront picks this up on its own within a few minutes.
            </p>
          </div>
        )}

        <div className="grid gap-8 xl:grid-cols-2">
          <Panel title="Identity">
            <div className="space-y-5 p-5">
              <Field label="Store name" error={errors.storeName}>
                <input value={draft.storeName} onChange={(e) => set('storeName', e.target.value)} className="field" />
              </Field>
              <Field label="Tagline" hint="Appears in the footer and social previews.">
                <textarea value={draft.tagline} onChange={(e) => set('tagline', e.target.value)} rows={2} className="field resize-y" />
              </Field>
            </div>
          </Panel>

          <Panel title="Contact & location">
            <div className="space-y-5 p-5">
              <Field
                label="WhatsApp number"
                required
                error={errors.whatsappNumber}
                hint="All orders, bookings and enquiries are routed here. International format without the plus — 234…"
              >
                <input value={draft.whatsappNumber} onChange={(e) => set('whatsappNumber', e.target.value)} className="field font-mono" placeholder="2349030438653" />
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Phone" error={errors.supportPhone}>
                  <input value={draft.supportPhone} onChange={(e) => set('supportPhone', e.target.value)} className="field" />
                </Field>
                <Field label="Email" error={errors.supportEmail}>
                  <input value={draft.supportEmail} onChange={(e) => set('supportEmail', e.target.value)} className="field" />
                </Field>
              </div>

              <Field label="Workshop address">
                <input value={draft.workshopAddress} onChange={(e) => set('workshopAddress', e.target.value)} className="field" />
              </Field>

              <Field label="Opening hours">
                <input value={draft.workshopHours} onChange={(e) => set('workshopHours', e.target.value)} className="field" />
              </Field>
            </div>
          </Panel>

          <Panel title="Delivery & payment">
            <div className="space-y-5 p-5">
              <Field label="Standard delivery fee (₦)" hint="Charged on delivery orders below the free threshold.">
                <input type="number" min={0} value={draft.deliveryFee} onChange={(e) => set('deliveryFee', e.target.value)} className="field" />
              </Field>

              <Field
                label="Free delivery above (₦)"
                hint={
                  Number(draft.freeDeliveryThreshold) > 0
                    ? `Currently means free delivery over ${formatNaira(Number(draft.freeDeliveryThreshold) * 100)}. Set to 0 to disable.`
                    : 'Set to 0 to disable free delivery entirely.'
                }
              >
                <input type="number" min={0} value={draft.freeDeliveryThreshold} onChange={(e) => set('freeDeliveryThreshold', e.target.value)} className="field" />
              </Field>

              <Field
                label="Payment instructions"
                hint="Confirmed to the customer on WhatsApp when their order is verified. Not published on the site."
              >
                <textarea value={draft.bankDetails} onChange={(e) => set('bankDetails', e.target.value)} rows={4} className="field resize-y" />
              </Field>
            </div>
          </Panel>

          <div className="space-y-8">
            <Panel title="Announcement bar">
              <div className="space-y-5 p-5">
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={draft.announcementEnabled}
                    onChange={(e) => set('announcementEnabled', e.target.checked)}
                    className="h-4 w-4 accent-[#00D4FF]"
                  />
                  <span className="text-[13px] text-chalk">Show the announcement bar</span>
                </label>

                <Field label="Message" hint="Up to 240 characters. Keep it factual — hours, capacity, closures.">
                  <input value={draft.announcement} onChange={(e) => set('announcement', e.target.value)} className="field" maxLength={240} />
                </Field>

                {draft.announcementEnabled && draft.announcement && (
                  <div className="border border-hairline bg-gunmetal">
                    <p className="border-b border-hairline px-4 py-2 font-mono text-[9px] uppercase tracking-technical text-slate">
                      Preview
                    </p>
                    <div className="flex items-center justify-center gap-3 px-4 py-3">
                      <span className="h-1 w-1 animate-signal-pulse bg-volt" aria-hidden />
                      <p className="truncate font-mono text-[10px] uppercase tracking-technical text-steel">
                        {draft.announcement}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Panel>

            <Panel title="Social links">
              <div className="space-y-5 p-5">
                <Field label="Instagram URL" error={errors['socials.0.href']}>
                  <input value={draft.instagram} onChange={(e) => set('instagram', e.target.value)} className="field" placeholder="https://instagram.com/arkvolt" />
                </Field>
                <Field label="X URL" error={errors['socials.1.href']}>
                  <input value={draft.twitter} onChange={(e) => set('twitter', e.target.value)} className="field" placeholder="https://x.com/arkvolt" />
                </Field>
                <p className="text-[11px] leading-relaxed text-slate">
                  The WhatsApp link is generated automatically from the number above and always
                  appears first in the footer.
                </p>
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </>
  );
}
