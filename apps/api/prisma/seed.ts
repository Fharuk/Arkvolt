import path from 'node:path';
import fs from 'node:fs';
import type { Prisma, PrismaClient } from '@prisma/client';
import type { Genre } from '@arkvolt/shared';
import { hashPassword } from '../src/lib/auth';
import { slugify } from '@arkvolt/shared';

/* ==================================================================== *
 * ARKVOLT seed
 *
 * Two jobs:
 *   1. Populate a real, launch-ready catalogue the owner can edit in the
 *      dashboard rather than staring at an empty table.
 *   2. Be safely re-runnable. `upsert` on natural keys throughout, so
 *      `npm run db:seed` twice does not duplicate anything.
 *
 * Content note: the store sells services, licensed software, hardware and
 * components. Titles from the owner's reference list are seeded into
 * `title_entries` as names only — they are requests, never transactions.
 * ==================================================================== */

const MEDIA = (file: string): string => `/media/${file}`;

/* ------------------------------------------------------------------ *
 * Categories
 * ------------------------------------------------------------------ */

const CATEGORIES = [
  {
    slug: 'pc-tune-ups',
    name: 'PC Tune-Ups & Setup',
    kind: 'SERVICE' as const,
    description: 'Diagnostic, optimisation and configuration work delivered on your machine.',
    sortOrder: 1,
  },
  {
    slug: 'installations',
    name: 'Installations & Imaging',
    kind: 'SERVICE' as const,
    description: 'Operating system deployment, driver integration and data migration.',
    sortOrder: 2,
  },
  {
    slug: 'data-recovery',
    name: 'Data Recovery',
    kind: 'SERVICE' as const,
    description: 'Recovery from failed drives, corrupted volumes and accidental deletion.',
    sortOrder: 3,
  },
  {
    slug: 'storage',
    name: 'Storage',
    kind: 'PART' as const,
    description: 'NVMe, SATA SSDs and external drives, supplied and fitted.',
    sortOrder: 4,
  },
  {
    slug: 'memory',
    name: 'Memory',
    kind: 'PART' as const,
    description: 'Laptop SODIMM and desktop DIMM kits, matched to your board.',
    sortOrder: 5,
  },
  {
    slug: 'thermal-cooling',
    name: 'Thermal & Cooling',
    kind: 'PART' as const,
    description: 'Pastes, pads, fans and coolers for machines running hot.',
    sortOrder: 6,
  },
  {
    slug: 'power-supplies',
    name: 'Power & Charging',
    kind: 'PART' as const,
    description: 'PSUs, laptop chargers and batteries with fitting available.',
    sortOrder: 7,
  },
  {
    slug: 'utilities',
    name: 'Utilities & Tools',
    kind: 'SOFTWARE' as const,
    description: 'Support tools we install and configure as part of our service work.',
    sortOrder: 8,
  },
];

/* ------------------------------------------------------------------ *
 * Repair services
 * ------------------------------------------------------------------ */

const SERVICES = [
  {
    slug: 'diagnostic-assessment',
    name: 'Full Diagnostic Assessment',
    tagline: 'Know exactly what is wrong before you spend a naira on parts.',
    short:
      'A structured hardware and software diagnostic: power delivery, thermals, storage health, memory integrity and OS integrity, documented in writing.',
    price: 5_000,
    priceType: 'FIXED' as const,
    duration: 60,
    turnaround: 'Same day',
    featured: true,
    sortOrder: 1,
    includes: [
      'Power rail and battery health measurement',
      'Storage SMART report with remaining-life estimate',
      'Memory integrity test (full pass)',
      'Thermal profile under sustained load',
      'Written findings, with photographs of any fault found',
    ],
    process: [
      { title: 'Intake and evidence', detail: 'We photograph the machine inside and out and log its condition with you present, so there is no dispute later about existing marks or damage.' },
      { title: 'Bench diagnostics', detail: 'We measure power delivery under load, read the SMART data from every attached drive, run a full memory pass and log the thermal curve against the manufacturer ceiling.' },
      { title: 'Written report', detail: 'You get the readings, the fault, the recommended fix and a fixed price. If the machine needs nothing, the diagnostic fee is all you pay and we tell you that plainly.' },
    ],
    faqs: [
      { q: 'Is the fee deducted from the repair?', a: 'Yes. If you approve the repair, the full ₦5,000 comes off the quoted price.' },
      { q: 'How long do you keep the machine?', a: 'Diagnostics are usually completed the same day. Anything needing parts goes to the queue once you approve the quote.' },
    ],
  },
  {
    slug: 'game-ready-setup',
    name: 'Game-Ready Setup',
    tagline: 'Your machine configured, patched and benchmarked for the titles you actually play.',
    short:
      'We prepare your PC for the titles you own: driver stack, runtime libraries, display and GPU settings, then a benchmark pass so you know what your hardware will sustain.',
    price: 8_000,
    priceType: 'FROM' as const,
    duration: 120,
    turnaround: '24–48 hours',
    featured: true,
    sortOrder: 2,
    includes: [
      'GPU driver clean install (DCH, correct branch)',
      'DirectX, Visual C++ and .NET runtime libraries complete',
      'In-game display, audio and controller configuration',
      'Thermal repaste if the machine throttles under sustained load',
      'Benchmark run with a written performance report',
    ],
    process: [
      { title: 'Hardware check', detail: 'Before we touch software we confirm your hardware can sustain the title. Every game has a requirement sheet and we check your CPU, GPU, VRAM and storage against it honestly, including where it will struggle.' },
      { title: 'Clean driver stack', detail: 'We remove whatever the previous install left behind, install the correct vendor driver for your card and confirm there are no residual conflicts in the event log.' },
      { title: 'Runtimes and configuration', detail: 'Every dependency the title expects, installed and verified. Display mode, frame-rate cap, audio device and controller mapping configured for your setup — not left at defaults.' },
      { title: 'Benchmark and hand over', detail: 'We run a sustained benchmark, log the frame times, and show you the numbers along with the settings we chose and why.' },
    ],
    faqs: [
      { q: 'Do you supply the game licence?', a: 'No. You provide your own licensed copy from Steam, Epic, GOG or a physical disc. We prepare the machine and verify it runs correctly — the work we bill for is our time and expertise.' },
      { q: 'Will a repaste really help?', a: 'On any laptop more than two years old, usually yes — often 8 to 15°C. We measure before and after and report what we actually saw, not what we hoped for.' },
    ],
  },
  {
    slug: 'os-clean-install',
    name: 'Operating System Clean Install',
    tagline: 'A genuinely clean Windows install — not a "reset" that keeps the old problems.',
    short:
      'Full partition wipe and fresh deployment of Windows onto your existing drive, with drivers, updates and your personal data migrated back across.',
    price: 10_000,
    priceType: 'FROM' as const,
    duration: 180,
    turnaround: 'Same day',
    featured: true,
    sortOrder: 3,
    includes: [
      'Complete data backup to external media before anything is wiped',
      'Fresh GPT partition, correct UEFI configuration',
      'All vendor drivers installed from source, not generic substitutes',
      'Windows updates applied to current',
      'Your documents, pictures and browser profile restored',
    ],
    process: [
      { title: 'Back up first, always', detail: 'Everything on the drive is copied to external storage and verified before we wipe. If the drive is already failing we tell you before we start and move to data recovery instead.' },
      { title: 'Deploy', detail: 'Clean partition table, correct UEFI/legacy mode for your board, and a genuinely fresh install — not a factory reset over a corrupted image. This is usually why the old problems do not come back.' },
      { title: 'Drivers and updates', detail: 'Chipset, graphics, audio, network and power management drivers from the manufacturer. Generic Windows substitutes are the source of most "new install, still broken" outcomes.' },
      { title: 'Restore and verify', detail: 'Your data goes back, and we walk you through what changed before you take the machine away.' },
    ],
    faqs: [
      { q: 'Do I need to bring a licence key?', a: 'If Windows was previously activated on this machine, the digital licence is tied to the hardware and reactivates automatically. If not, you will need to supply a valid key.' },
      { q: 'What if my drive is failing?', a: 'We will show you the SMART reading and recommend replacement rather than installing onto failing media.' },
    ],
  },
  {
    slug: 'thermal-service',
    name: 'Thermal Service & Repaste',
    tagline: 'The single highest-value repair on an older laptop or desktop.',
    short:
      'Complete teardown, dust removal from the heatsink and fan assembly, and repaste with a quality non-conductive compound. Measured before and after.',
    price: 7_000,
    priceType: 'FROM' as const,
    duration: 120,
    turnaround: 'Same day',
    featured: false,
    sortOrder: 4,
    includes: [
      'Full teardown and reassembly',
      'Heatsink and fan assembly cleared of compacted dust',
      'Quality non-conductive thermal compound applied',
      'Thermal pads replaced where the manufacturer used them',
      'Before/after temperature readings under identical load',
    ],
    process: [
      { title: 'Baseline measurement', detail: 'Before opening anything, we run the machine under sustained load and log CPU and GPU temperatures at a fixed ambient. This is the number you paid to improve and we do not guess at it.' },
      { title: 'Teardown and clean', detail: 'The heatsink comes out entirely. Dust that has compacted into the fin stack will not come out with compressed air from outside — it has to be removed by hand.' },
      { title: 'Repaste and reassemble', detail: 'Old compound is cleaned off with isopropyl, fresh compound applied at correct coverage for the die, and the assembly torqued back down in the right sequence.' },
      { title: 'Verification', detail: 'Same load, same ambient. You get both numbers in writing.' },
    ],
    faqs: [
      { q: 'How much improvement should I expect?', a: 'Typical laptops see 8–15°C drops in sustained load. Machines that were thermally throttling often gain back a meaningful amount of performance too.' },
      { q: 'Can this fix random shutdowns?', a: 'If they are thermal shutdowns, yes. If they continue afterwards, the diagnostic points elsewhere — we will tell you what we find.' },
    ],
  },
  {
    slug: 'data-recovery',
    name: 'Data Recovery',
    tagline: 'Assessment first, no-recovery no-fee. Recovery is quoted before we attempt it.',
    short:
      'Recovery from accidental deletion, formatted partitions, corrupted volumes and drives that no longer mount. Failed hardware is assessed before any attempt is made.',
    price: 15_000,
    priceType: 'FROM' as const,
    duration: 240,
    turnaround: '2–5 working days',
    featured: true,
    sortOrder: 5,
    includes: [
      'Sector-level assessment of the drive before any attempt',
      'No recovery, no fee on the recovery component',
      'Recovered data delivered on media you provide',
      'Written report on what was and was not recoverable',
    ],
    process: [
      { title: 'Stop using the drive', detail: 'Every write to a drive you want data off reduces what is recoverable. Power it down and bring it in. Do not run repair tools on it.' },
      { title: 'Assessment', detail: 'We read the drive at sector level and characterise the failure. If there is physical damage to the platters or heads, we tell you straight away and do not proceed — further attempts cause permanent loss.' },
      { title: 'Recovery attempt', detail: 'Logical recovery where the drive reads, imaging to healthy media first so we never work directly on the original. You get a file listing to review before paying anything.' },
      { title: 'Return the data', detail: 'Recovered files are handed over on media you supply, along with a written account of what was recoverable and what was not.' },
    ],
    faqs: [
      { q: 'What if nothing is recoverable?', a: 'You pay nothing for the recovery attempt. The assessment fee covers the work already done.' },
      { q: 'Do you open drives in a clean room?', a: 'No, and we will not claim otherwise. Mechanical failures needing a clean room are referred to a specialist lab, because attempting them here would destroy your data.' },
    ],
  },
  {
    slug: 'onsite-support',
    name: 'On-Site Business Support',
    tagline: 'Scheduled visits for offices running on machines that cannot leave the building.',
    short:
      'Scheduled on-site maintenance for small offices and studios in Lagos: workstations, network gear and printers, maintained on a recurring agreement.',
    price: 25_000,
    priceType: 'FROM' as const,
    duration: 180,
    turnaround: 'Scheduled',
    featured: false,
    sortOrder: 6,
    includes: [
      'Scheduled visit at a fixed time, not a window',
      'Workstation health checks and thermal clean',
      'Network, router and printer support',
      'Replacement parts quoted before fitting',
      'Written summary of work done and anything to watch',
    ],
    process: [
      { title: 'Survey', detail: 'We walk the site and inventory what you actually run — models, ages, warranty status, and where the failures are recurring.' },
      { title: 'Agreement', detail: 'A schedule and a rate. Recurring agreements are priced lower per visit than one-off callouts.' },
      { title: 'Visits', detail: 'Fixed appointment times, work logged, parts quoted before fitting. You receive a written summary after each visit.' },
    ],
    faqs: [
      { q: 'Which areas do you cover?', a: 'Lagos mainland and island. Outside Lagos we support remotely or arrange courier for the equipment.' },
      { q: 'Can you work outside business hours?', a: 'Yes, by arrangement. Evening and weekend slots carry a different rate which we will confirm in writing first.' },
    ],
  },
];

/* ------------------------------------------------------------------ *
 * Products
 * ------------------------------------------------------------------ */

type ProductSeed = {
  slug: string;
  name: string;
  sku: string;
  kind: 'SOFTWARE' | 'HARDWARE' | 'PART';
  categorySlug: string;
  tagline: string;
  short: string;
  description: string;
  price: number;
  compareAt?: number;
  priceType: 'FIXED' | 'FROM' | 'QUOTE';
  stock: number;
  trackStock: boolean;
  featured: boolean;
  sortOrder: number;
  images: { url: string; alt: string }[];
  specs: { label: string; value: string }[];
  requirements: { label: string; items: string[] }[];
  installSteps: { title: string; detail: string }[];
  included: string[];
  deliveryNotes: string;
  tags: string[];
};

const PRODUCTS: ProductSeed[] = [
  {
    slug: 'arkvolt-nvme-1tb-gen4',
    name: '1TB NVMe Gen4 SSD — Supplied & Fitted',
    sku: 'AV-STO-1TBNVME',
    kind: 'PART',
    categorySlug: 'storage',
    tagline: 'The upgrade that makes an old machine feel new.',
    short: 'A 1TB PCIe 4.0 NVMe drive, supplied and fitted at our bench with your existing data migrated across.',
    description:
      'Storage is the bottleneck in almost every machine more than three years old. A mechanical drive caps out near 120 MB/s; this drive sustains several gigabytes per second for sequential reads and, more importantly for daily use, holds queue depth far better under load. That difference is why a machine with the same CPU and RAM feels completely different to use after the swap.\n\nWe supply and fit, then migrate your existing installation and data across in the same visit. You keep your software, your settings and your files — you just stop waiting.',
    price: 78_000,
    compareAt: 92_000,
    priceType: 'FIXED',
    stock: 14,
    trackStock: true,
    featured: true,
    sortOrder: 1,
    images: [
      { url: MEDIA('motherboard-detail.webp'), alt: 'M.2 NVMe storage module mounted on a motherboard' },
      { url: MEDIA('pcb-macro-dark.webp'), alt: 'Macro detail of circuit board components' },
    ],
    specs: [
      { label: 'Capacity', value: '1 TB' },
      { label: 'Interface', value: 'PCIe 4.0 ×4, NVMe 1.4' },
      { label: 'Form factor', value: 'M.2 2280' },
      { label: 'Sequential read', value: 'Up to 7,000 MB/s' },
      { label: 'Sequential write', value: 'Up to 6,000 MB/s' },
      { label: 'Endurance', value: '600 TBW' },
      { label: 'Warranty', value: '5 years' },
    ],
    requirements: [
      {
        label: 'Your machine must have',
        items: [
          'An M.2 M-key slot on the motherboard or a free PCIe slot with an adapter',
          'PCIe 3.0 slots are supported — the drive simply runs at 3.0 speed',
          'If no M.2 slot exists, a 2.5" SATA drive is the alternative; message us and we will advise',
        ],
      },
      {
        label: 'Before you book',
        items: [
          'Back up anything irreplaceable — migration is reliable but never guaranteed',
          'Tell us your exact laptop or motherboard model so we can confirm slot availability',
          'Allow 90 minutes at the bench for supply, fitting and migration',
        ],
      },
    ],
    installSteps: [
      { title: 'Model check', detail: 'We confirm your exact machine has a free M.2 M-key slot and what generation of PCIe it supports. For laptops we check the service manual for the drive bay location before you arrive.' },
      { title: 'Data migration', detail: 'Your existing drive is imaged onto the new one while still in place, so the source drive stays untouched as a fallback until you have confirmed everything works.' },
      { title: 'Fitting', detail: 'The drive is seated, the retention screw torqued, and for laptops the anti-static procedure is followed throughout. The original drive is returned to you if you want it.' },
      { title: 'Verification', detail: 'We check the drive reports its full capacity, confirm SMART status is clean, and run a sequential and random read test to prove the link is running at the correct generation.' },
    ],
    included: ['1TB PCIe 4.0 NVMe drive', 'Fitting at our bench', 'Full data migration', 'Original drive returned to you'],
    deliveryNotes: 'Fitting is included for Lagos customers. Outside Lagos we ship the drive and provide a guided walkthrough, or you can courier the machine to us.',
    tags: ['nvme', 'ssd', 'upgrade', 'storage', 'speed'],
  },
  {
    slug: 'arkvolt-thermal-service-kit',
    name: 'Thermal Service Kit — Premium Paste & Pads',
    sku: 'AV-THM-KIT12',
    kind: 'PART',
    categorySlug: 'thermal-cooling',
    tagline: 'Everything needed for one full repaste, including the pads most people forget.',
    short: '12 g of non-conductive thermal compound, a full set of thermal pads, applicator and cleaning swabs.',
    description:
      'A repaste done properly needs more than paste. Most laptops use thermal pads of specific thicknesses on the VRM and memory, and those pads compress and degrade over the same years the paste does. Replacing the paste while leaving hardened pads in place is why some repastes produce disappointing results.\n\nThis kit covers a complete service: compound, pads in the thicknesses machines actually use, and the cleaning supplies to remove the old material before applying new. Non-conductive throughout — safe on any die, including bare-die laptop GPUs.',
    price: 12_500,
    priceType: 'FIXED',
    stock: 40,
    trackStock: true,
    featured: false,
    sortOrder: 2,
    images: [{ url: MEDIA('hardware-assembly.webp'), alt: 'Internal hardware components during assembly' }],
    specs: [
      { label: 'Compound volume', value: '12 g' },
      { label: 'Conductivity', value: 'Non-conductive, non-capacitive' },
      { label: 'Thermal conductivity', value: '12.5 W/mK' },
      { label: 'Operating range', value: '-40°C to 180°C' },
      { label: 'Pads included', value: '0.5 / 1.0 / 1.5 / 2.0 mm' },
      { label: 'Shelf life', value: '5 years sealed' },
    ],
    requirements: [
      {
        label: 'Tools you will need',
        items: [
          'Correct screwdriver bits for your machine — usually Phillips PH0 and PH1',
          'Isopropyl alcohol is included in the swabs',
          'A plastic spudger for opening clips without marking the chassis',
        ],
      },
    ],
    installSteps: [
      { title: 'Open and assess', detail: 'Disconnect the battery first on any laptop. Photograph each stage of disassembly so reassembly is unambiguous.' },
      { title: 'Clean the old material', detail: 'Old paste is removed with isopropyl until the die and heatsink surfaces are bare metal. Any residue left behind measurably reduces contact.' },
      { title: 'Apply', detail: 'A pea-sized amount at the centre of the die for direct-die laptop chips; a thin spread line for larger desktop IHS surfaces. Pressure from the heatsink does the rest.' },
      { title: 'Pads and reassembly', detail: 'Replace pads at their measured thickness — too thick lifts the heatsink off the die and makes temperatures worse. Torque the screws in the numbered order, in passes.' },
    ],
    included: ['12 g premium compound', '8 thermal pads across 4 thicknesses', 'Applicator and 10 cleaning swabs', 'Written application guide'],
    deliveryNotes: 'Ships nationwide by courier. Available for same-day pickup in Lagos.',
    tags: ['thermal', 'paste', 'repaste', 'cooling', 'overheating'],
  },
  {
    slug: 'arkvolt-16gb-ddr4-kit',
    name: '16GB DDR4 Laptop Memory Kit (2×8GB)',
    sku: 'AV-MEM-16DDR4',
    kind: 'PART',
    categorySlug: 'memory',
    tagline: 'Matched pair, tested on your machine before you pay.',
    short: 'A 16GB matched SODIMM kit at 3200 MT/s, fitted and verified with a full memory integrity pass.',
    description:
      'Memory is misdiagnosed constantly. "It needs more RAM" is the most common advice given and the least often true — a machine that is slow because it is on a failing mechanical drive will not be fixed by adding memory. What memory does fix is swapping under a heavy workload: many browser tabs, virtual machines, photo and video editing, and running a game alongside anything else.\n\nWe fit matched pairs rather than mixing sticks when dual-channel operation is available, because a mismatched pair can silently drop your bandwidth. Before you collect, we run a full integrity pass. If anything fails, we replace it and you do not pay twice.',
    price: 46_000,
    priceType: 'FIXED',
    stock: 22,
    trackStock: true,
    featured: false,
    sortOrder: 3,
    images: [{ url: MEDIA('hardware-assembly.webp'), alt: 'Memory modules being installed' }],
    specs: [
      { label: 'Total capacity', value: '16 GB (2 × 8 GB)' },
      { label: 'Type', value: 'DDR4 SODIMM, 260-pin' },
      { label: 'Speed', value: '3200 MT/s, CL22' },
      { label: 'Voltage', value: '1.2 V' },
      { label: 'Warranty', value: 'Lifetime limited' },
    ],
    requirements: [
      {
        label: 'Check before ordering',
        items: [
          'DDR4 SODIMM only — this does not fit DDR3 or DDR5 machines',
          'Your machine needs two accessible SODIMM slots for the full kit',
          'Many thin-and-light laptops have soldered memory with no slots; message us your model and we will confirm',
          'Maximum supported capacity varies by chipset — we check this before ordering',
        ],
      },
    ],
    installSteps: [
      { title: 'Confirm compatibility', detail: 'We look up your exact model against the chipset specification. If your machine has a 16GB ceiling and one soldered 8GB module, a 2×8GB kit is the wrong purchase and we will tell you so.' },
      { title: 'Fit', detail: 'Battery disconnected, modules seated at the correct angle then pressed flat until the retention clips engage. SODIMMs seated at the wrong angle are the usual cause of a no-boot after an upgrade.' },
      { title: 'Verify', detail: 'Boot check, BIOS confirmation of total capacity, then a full memory integrity pass. This takes time and we do not skip it — the failure rate on new modules is low but not zero.' },
      { title: 'Report', detail: 'You get the BIOS reading and the test result, plus your original modules back if you want them.' },
    ],
    included: ['2 × 8GB matched SODIMM modules', 'Fitting at our bench', 'Full memory integrity test', 'Original modules returned'],
    deliveryNotes: 'Fitting included for Lagos customers. Nationwide courier available for the modules alone.',
    tags: ['ram', 'memory', 'upgrade', 'multitasking'],
  },
  {
    slug: 'arkvolt-driver-suite-pro',
    name: 'ARKVOLT Driver Suite — Pro Licence',
    sku: 'AV-SW-DRVPRO',
    kind: 'SOFTWARE',
    categorySlug: 'utilities',
    tagline: 'One machine, permanently current. Sold only with setup service.',
    short: 'A maintained driver and runtime manifest for your specific machine, kept current for twelve months.',
    description:
      'Generic driver updaters match on a name string and frequently install the wrong package — which is how machines end up with greyed-out audio devices and 60Hz displays that should run at 144Hz. This is not that.\n\nWe build a manifest for your exact hardware: the correct vendor driver branch for your GPU, chipset, network adapter and audio, with the runtime libraries your software expects. It is applied on a fresh install and stays valid for twelve months — when a vendor ships a meaningful update, message us and we will tell you whether it matters for your machine.\n\nThis is sold as an accompaniment to our installation services rather than as a download, because a driver manifest is only worth anything when applied to a machine we can verify.',
    price: 9_000,
    priceType: 'FIXED',
    stock: 999,
    trackStock: false,
    featured: true,
    sortOrder: 4,
    images: [{ url: MEDIA('workbench-diagnostics.webp'), alt: 'Workbench setup used for system configuration' }],
    specs: [
      { label: 'Machines covered', value: '1' },
      { label: 'Licence term', value: '12 months' },
      { label: 'Applies to', value: 'Windows 10 and 11 (64-bit)' },
      { label: 'Delivered via', value: 'Applied at our bench or by remote session' },
      { label: 'Updates', value: 'Reviewed on request for 12 months' },
    ],
    requirements: [
      {
        label: 'Requirements',
        items: [
          'Windows 10 or 11, 64-bit only',
          'A working internet connection during setup',
          'For remote application: AnyDesk, installed at no charge',
          'Sold with a setup or clean-install service — not available standalone',
        ],
      },
    ],
    installSteps: [
      { title: 'Hardware identification', detail: 'We read your exact hardware IDs rather than relying on the marketing name of the machine. This is what prevents the wrong driver being matched.' },
      { title: 'Manifest build', detail: 'The correct driver branch is identified for each component — GPU, chipset, network, audio and storage controller — along with any runtime libraries your installed software requires.' },
      { title: 'Application', detail: 'Existing broken or duplicated driver entries are removed first, then the correct packages are installed cleanly. A dirty install over an old one is why "updating drivers" so often changes nothing.' },
      { title: 'Verification', detail: 'Device Manager confirms zero problem devices, and we check display refresh rate, audio device presence and network throughput as practical confirmation.' },
    ],
    included: ['Hardware identification for one machine', 'Correct vendor drivers for every component', 'Required runtime libraries', '12 months of update guidance'],
    deliveryNotes: 'Applied remotely by appointment, or at our bench alongside any installation service.',
    tags: ['drivers', 'software', 'windows', 'setup'],
  },
  {
    slug: 'arkvolt-psu-650w-bronze',
    name: '650W 80+ Bronze PSU — Supplied & Fitted',
    sku: 'AV-PWR-650BRZ',
    kind: 'PART',
    categorySlug: 'power-supplies',
    tagline: 'The component nobody upgrades and the one most likely to take everything with it.',
    short: 'A 650W 80+ Bronze semi-modular unit with over/under-voltage, overcurrent and short-circuit protection.',
    description:
      'A failing power supply does not usually announce itself. It causes random shutdowns under load, USB devices that disconnect intermittently, drives that drop out, and memory errors that survive every memory test you run. It is also the one component whose failure can destroy the CPU, GPU and drives attached to it.\n\nIf your machine is more than five years old, or has ever spent time on generator power, the supply is worth replacing on age alone. This unit is 80+ Bronze certified with full protection circuitry, and we fit it with proper cable management rather than the tangle that came out.',
    price: 68_000,
    compareAt: 75_000,
    priceType: 'FIXED',
    stock: 9,
    trackStock: true,
    featured: false,
    sortOrder: 5,
    images: [
      { url: MEDIA('hardware-assembly.webp'), alt: 'Power supply being installed in a system' },
      { url: MEDIA('workbench-diagnostics.webp'), alt: 'Bench testing of a system' },
    ],
    specs: [
      { label: 'Rated output', value: '650 W continuous' },
      { label: 'Efficiency', value: '80 PLUS Bronze' },
      { label: 'Modularity', value: 'Semi-modular' },
      { label: 'Protection', value: 'OVP, UVP, OCP, SCP, OTP' },
      { label: 'Fan', value: '120 mm, temperature controlled' },
      { label: 'Warranty', value: '5 years' },
    ],
    requirements: [
      {
        label: 'Sizing your machine',
        items: [
          '650 W suits most single-GPU builds with a mid-range to upper-mid graphics card',
          'Flag if you run an RTX 4080/4090-class card — you need a higher-capacity unit and we will quote accordingly',
          'Confirm your case takes a standard ATX supply; some prebuilt and small-form-factor machines do not',
          'Laptops do not use this part — those need a charger or battery replacement',
        ],
      },
    ],
    installSteps: [
      { title: 'Load calculation', detail: 'We add up your actual connected components, not the label on the box, and confirm the capacity and connector set is right for your system before you buy.' },
      { title: 'Fitting', detail: 'Old unit removed, new one mounted with correct airflow orientation (fan down in a bottom-mounted bay), and only the cables your build needs are connected. Unused modular cables stay out of the case.' },
      { title: 'Rail verification', detail: 'We check the 12V, 5V and 3.3V rails under idle and load with a meter and confirm they hold within ATX tolerance.' },
      { title: 'Stress verification', detail: 'A sustained load test confirms stability at full draw before you take it home.' },
    ],
    included: ['650W 80+ Bronze PSU', 'Fitting and cable management', 'Rail voltage verification under load', 'Original unit returned to you'],
    deliveryNotes: 'Fitting included within Lagos. Nationwide courier available for the unit alone.',
    tags: ['psu', 'power', 'shutdowns', 'stability'],
  },
  {
    slug: 'arkvolt-os-recovery-media',
    name: 'Bootable Recovery & Diagnostics Toolkit',
    sku: 'AV-SW-RCVUSB',
    kind: 'SOFTWARE',
    categorySlug: 'utilities',
    tagline: 'A rescue drive that works when the machine will not boot.',
    short: 'A prepared USB drive with diagnostic and recovery tools, set up and explained for your specific machine.',
    description:
      'When a machine will not boot, everything you normally rely on is unavailable. This is a prepared drive that boots independently of your installed operating system and gives access to the tools needed to diagnose or recover: partition inspection, SMART data from every attached drive, memory testing, password and filesystem utilities, and offline malware scanning.\n\nWe build it against your machine — the specific build has your network driver integrated, which is the detail that decides whether a rescue environment can reach the internet when you need it. You get a walkthrough of what each tool does, so it is useful to you rather than a folder of things you are afraid to click.',
    price: 14_000,
    priceType: 'FIXED',
    stock: 30,
    trackStock: true,
    featured: false,
    sortOrder: 6,
    images: [{ url: MEDIA('workbench-diagnostics.webp'), alt: 'Diagnostic workstation' }],
    specs: [
      { label: 'Media', value: 'USB 3.0 flash drive, 32 GB' },
      { label: 'Boots', value: 'UEFI and legacy BIOS' },
      { label: 'Integrations', value: 'Your machine network drivers pre-loaded' },
      { label: 'Utilities', value: 'Partition, SMART, memory, filesystem, offline AV' },
      { label: 'Delivered', value: 'Prepared and walked through with you' },
    ],
    requirements: [
      {
        label: 'Bring with you',
        items: [
          'The machine it is intended for, so we can test booting it here',
          'Note whether your machine is UEFI or legacy — we will detect it, but knowing helps',
          'Your network details if you want connectivity verified in the rescue environment',
        ],
      },
    ],
    installSteps: [
      { title: 'Build target', detail: 'We prepare the image with the drivers your specific network and storage hardware needs, since a rescue environment without working network is severely limited.' },
      { title: 'Boot test', detail: 'Tested on your actual machine to confirm it boots both ways — UEFI and legacy — and that the storage controller is detected.' },
      { title: 'Walkthrough', detail: 'We sit with you and demonstrate each tool on your machine, so you know how to inspect a drive, read SMART data and check memory before you need to.' },
      { title: 'Handbook', detail: 'A one-page printed reference of what to run and in what order for the common failure cases.' },
    ],
    included: ['32GB USB 3.0 drive, prepared', 'Your machine network drivers integrated', 'Boot tested on your hardware', 'Guided walkthrough and printed handbook'],
    deliveryNotes: 'Prepared at our bench with your machine present. Nationwide courier available for a generic build.',
    tags: ['recovery', 'diagnostics', 'usb', 'boot', 'rescue'],
  },
];

/* ------------------------------------------------------------------ *
 * Settings — the values that make the storefront real
 * ------------------------------------------------------------------ */

const SETTINGS: Prisma.InputJsonValue = {
  storeName: 'ARKVOLT',
  tagline: 'Software supply and hardware repair for machines that have to work.',
  whatsappNumber: '2349030438653',
  supportPhone: '0903 043 8653',
  supportEmail: 'hello@arkvolt.ng',
  workshopAddress: 'Arkvolt Workshop, Computer Village, Ikeja, Lagos',
  workshopHours: 'Mon–Sat, 09:00–19:00 WAT · Sunday by arrangement',
  announcement: 'Same-day diagnostics on weekdays. Bring the machine before 15:00.',
  announcementEnabled: true,
  bankDetails: 'Bank transfer details are confirmed over WhatsApp when your order is verified.',
  deliveryFeeKobo: 350_000,
  freeDeliveryThresholdKobo: 15_000_000,
  currency: 'NGN',
  socials: [
    { label: 'WhatsApp', href: 'https://wa.me/2349030438653' },
    { label: 'Instagram', href: 'https://instagram.com/arkvolt' },
    { label: 'X', href: 'https://x.com/arkvolt' },
  ],
};

/* ==================================================================== *
 * Runner
 * ==================================================================== */

export const runSeed = async (prisma: PrismaClient, log: (msg: string) => void = console.log): Promise<void> => {
  /* --- Admin ------------------------------------------------------ */
  const email = process.env.ADMIN_EMAIL ?? 'admin@arkvolt.ng';
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? 'Arkvolt Admin';

  if (password) {
    const passwordHash = await hashPassword(password);
    await prisma.adminUser.upsert({
      where: { email },
      create: { email, name, passwordHash },
      // Deliberately does not overwrite an existing password: re-running the
      // seed must never silently reset a password the owner has changed.
      update: { name },
    });
    log(`✓ Administrator ready — ${email}`);
  } else {
    log('• ADMIN_PASSWORD not set: administrator seed skipped. Set it in .env to create the account.');
  }

  /* --- Settings --------------------------------------------------- */
  await prisma.setting.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', data: SETTINGS },
    update: {},
  });
  log('✓ Store settings ready');

  /* --- Categories ------------------------------------------------- */
  const categoryIds = new Map<string, string>();
  for (const c of CATEGORIES) {
    const row = await prisma.category.upsert({
      where: { slug: c.slug },
      create: { name: c.name, slug: c.slug, kind: c.kind, description: c.description, sortOrder: c.sortOrder },
      update: { name: c.name, kind: c.kind, description: c.description, sortOrder: c.sortOrder },
    });
    categoryIds.set(c.slug, row.id);
  }
  log(`✓ ${CATEGORIES.length} categories`);

  /* --- Services --------------------------------------------------- */
  for (const s of SERVICES) {
    const data = {
      name: s.name,
      tagline: s.tagline,
      shortDescription: s.short,
      description: `${s.short}\n\nEvery price below is a starting point. We confirm the final figure in writing after the diagnostic, before any work begins — you will never receive a bill larger than the number you approved.`,
      priceKobo: s.price * 100,
      priceType: s.priceType,
      durationMins: s.duration,
      turnaround: s.turnaround,
      includes: s.includes as unknown as Prisma.InputJsonValue,
      process: s.process as unknown as Prisma.InputJsonValue,
      faqs: s.faqs as unknown as Prisma.InputJsonValue,
      images: [
        {
          url: MEDIA(
            s.slug === 'diagnostic-assessment' || s.slug === 'data-recovery'
              ? 'workbench-diagnostics.webp'
              : s.slug === 'onsite-support'
                ? 'server-rack.webp'
                : 'laptop-board-repair.webp',
          ),
          alt: s.name,
        },
      ] as unknown as Prisma.InputJsonValue,
      status: 'ACTIVE' as const,
      isFeatured: s.featured,
      sortOrder: s.sortOrder,
    };

    await prisma.service.upsert({
      where: { slug: s.slug },
      create: { slug: s.slug, ...data },
      update: data,
    });
  }
  log(`✓ ${SERVICES.length} repair services`);

  /* --- Products --------------------------------------------------- */
  for (const p of PRODUCTS) {
    const categoryId = categoryIds.get(p.categorySlug);
    if (!categoryId) throw new Error(`Unknown category slug: ${p.categorySlug}`);

    const data = {
      name: p.name,
      sku: p.sku,
      kind: p.kind,
      status: 'ACTIVE' as const,
      categoryId,
      tagline: p.tagline,
      shortDescription: p.short,
      description: p.description,
      priceKobo: p.price * 100,
      compareAtKobo: p.compareAt ? p.compareAt * 100 : null,
      priceType: p.priceType,
      stock: p.stock,
      trackStock: p.trackStock,
      isFeatured: p.featured,
      sortOrder: p.sortOrder,
      images: p.images as unknown as Prisma.InputJsonValue,
      specs: p.specs as unknown as Prisma.InputJsonValue,
      requirements: p.requirements as unknown as Prisma.InputJsonValue,
      installSteps: p.installSteps as unknown as Prisma.InputJsonValue,
      included: p.included as unknown as Prisma.InputJsonValue,
      deliveryNotes: p.deliveryNotes,
      tags: p.tags as unknown as Prisma.InputJsonValue,
      metaTitle: `${p.name} — ARKVOLT`,
      metaDescription: p.short.slice(0, 300),
    };

    await prisma.product.upsert({
      where: { slug: p.slug },
      create: { slug: p.slug, ...data },
      update: data,
    });
  }
  log(`✓ ${PRODUCTS.length} products`);

  /* --- Title reference index -------------------------------------- *
   * Read from the generated file rather than being inlined: the transform
   * script is the single source of truth for how raw listings were cleaned.
   * ---------------------------------------------------------------- */
  const titlesPath = path.join(__dirname, 'titles.json');
  if (fs.existsSync(titlesPath)) {
    const titles = JSON.parse(fs.readFileSync(titlesPath, 'utf8')) as {
      name: string;
      slug: string;
      series: string | null;
      genre: Genre;
      platforms: string[];
    }[];

    // createMany with skipDuplicates: fast, and idempotent on the slug key.
    await prisma.titleEntry.createMany({
      data: titles.map((t) => ({
        name: t.name,
        slug: t.slug,
        series: t.series,
        genre: t.genre,
        platforms: t.platforms as unknown as Prisma.InputJsonValue,
      })),
      skipDuplicates: true,
    });

    const total = await prisma.titleEntry.count();
    log(`✓ ${total} titles indexed for setup requests (from ${titles.length} seed rows)`);
  } else {
    log('• titles.json not found — run `python3 scripts/build-titles.py` to regenerate the title index.');
  }

  log('\nSeed complete.\n');
};

/** Direct invocation: `npm run db:seed` */
if (require.main === module) {
  const { prisma } = require('../src/db') as typeof import('../src/db');
  runSeed(prisma)
    .catch((err: unknown) => {
      console.error('\nSeed failed:', err instanceof Error ? err.message : err);
      process.exitCode = 1;
    })
    .finally(() => {
      void prisma.$disconnect();
    });
}

// Referenced so the unused-import lint rule does not strip slugify, which the
// dashboard also relies on for the same slug format.
void slugify;
