"""Transform the raw ARKVOLT list into a clean, classified title index.

Strips every distribution artefact (repack groups, scene tags, piracy-site
watermarks, archive extensions), discards non-title rows, normalises names,
dedupes, and infers franchise + genre. Output: JSON consumed by the seed.
"""
import json, re, unicodedata
import pypdf

RAW = "/home/user/uploads/ARKVOLT_GAMES_AND_SOFTWARE__LIST.pdf"

# Rows that are not titles at all: tooling, patches, config files, save games.
NON_TITLES = {
    "dxvk", "steam", "fifa patch", "silentpatchsa", "cod4 sp crack",
    "injustice gods among us savegame", "mafia definitive edition config file",
    "dxvk 1 10 3", "dxvk-1 10 3", "assassin's creed murderous edition",
}

NOISE = [
    r"\[[^\]]*repack[^\]]*\]", r"\[[^\]]*dodi[^\]]*\]", r"\[[^\]]*fitgirl[^\]]*\]",
    r"\[[^\]]*cpy[^\]]*\]", r"\[[^\]]*reloaded[^\]]*\]", r"\[[^\]]*elamigos[^\]]*\]",
    r"\(\s*www\.[^)]*\)", r"worldsrc\.[a-z]*[_\s]*", r"www\.[a-z0-9.\-]+[_\s]*",
    r"thepcgames\.net", r"apunkagames\.(net|biz)", r"la ?royal",
    r"-\s*(cpy|reloaded|dodi|fitgirl|elamigos|plaza|codex|skidrow)\b",
    r"\.iso\b", r"\.7z\b", r"\.tar\.gz\b", r"\.rar\b",
    r"\(1\)", r"\bmulti\d+\b", r"\bde\.re?pack\b", r"\brepack\b",
    r"\bfixed\b", r"\bby\.?\s*chovka\b", r"\bde\.re?pack\.by\.chovka\b",
    r"\bspecial edition\b(?!\s*[-–])",
    r"\s*-\s*$",
]

# Canonical renames where the raw listing is an abbreviation or a scene label.
RENAMES = {
    "call duty ghost": "Call of Duty: Ghosts",
    "cod4 sp crack": None,
    "gow": "God of War",
    "metal gear": "Metal Gear Solid",
    "batman tew tts shadows edition": "Batman: The Enemy Within",
    "resident evil village": "Resident Evil Village",
    "e football pes 2021": "eFootball PES 2021",
    "e football pes 2021": "eFootball PES 2021",
    "pes 2022": "eFootball 2022",
    "pro evolution soccer 2015": "Pro Evolution Soccer 2015",
    "farcry new dawn": "Far Cry New Dawn",
    "farcry new dawn 2": "Far Cry New Dawn",
    "grand theft auto san andreas retextured": "Grand Theft Auto: San Andreas",
    "grandtheftauto sanandreas": "Grand Theft Auto: San Andreas",
    "gta vice city": "Grand Theft Auto: Vice City",
    "worldsrc org resident evil 3": "Resident Evil 3",
    "worldsrc com far cry primal": "Far Cry Primal",
    "naruto x boruto unsc": "Naruto x Boruto: Ultimate Ninja Storm Connections",
    "naruto storm4": "Naruto Shippuden: Ultimate Ninja Storm 4",
    "gears 5": "Gears 5",
    "gear 5": "Gears 5",
    "the walking dead a new frontier episode 3": "The Walking Dead: A New Frontier",
    "the evil within": "The Evil Within",
    "lego the lord of the rings": "LEGO The Lord of the Rings",
    "sniper ghost warrior contracts 2 deluxe arsenal edition": "Sniper: Ghost Warrior Contracts 2",
    "shadow the tomb raider": "Shadow of the Tomb Raider",
    "tomb raider": "Tomb Raider (2013)",
    "mafia definitive edition": "Mafia: Definitive Edition",
    "mafia 3 definitive edition": "Mafia III: Definitive Edition",
    "marvel spiderman remastered": "Marvel's Spider-Man Remastered",
    "marvels avengers": "Marvel's Avengers",
    "spider man web of shadows": "Spider-Man: Web of Shadows",
    "spiderman shattered dimensions": "Spider-Man: Shattered Dimensions",
    "assassins creed valhalla": "Assassin's Creed Valhalla",
    "bioshock remastered": "BioShock Remastered",
    "castlevania lords of the shadows": "Castlevania: Lords of Shadow",
    "control": "Control",
    "legends": "LEGO DC Super-Villains",
    # --- second pass: mangled names, roman numerals, scene suffixes ---------
    "bb bf3": "Battlefield 3",
    "bio shock remastered": "BioShock Remastered",
    "need for speed most wanted 2012 corepack": "Need for Speed: Most Wanted (2012)",
    "saints row iv repack": "Saints Row IV",
    "saints row gat out of hell": "Saints Row: Gat out of Hell",
    "saints row the third remastered": "Saints Row: The Third Remastered",
    "euro ts2": "Euro Truck Simulator 2",
    "football manager 2021 footgirl": "Football Manager 2021",
    "detroit become human": "Detroit: Become Human",
    "dragon ball sparking zero": "Dragon Ball: Sparking! ZERO",
    "la noire": "L.A. Noire",
    "wonderland secret worlds": "Wonderland: Secret Worlds",
    "last of us": "The Last of Us",
    "assassin's creed 2": "Assassin's Creed II",
    "assassin's creed 3 remastered": "Assassin's Creed III Remastered",
    "assassin's creed 4 black flag": "Assassin's Creed IV: Black Flag",
    "batman arkham knight": "Batman: Arkham Knight",
    "batman the telltale series": "Batman: The Telltale Series",
    "battlefield bad company 2": "Battlefield: Bad Company 2",
    "castlevania lords of shadow": "Castlevania: Lords of Shadow",
    "call of duty black ops": "Call of Duty: Black Ops",
    "call of duty black ops 2": "Call of Duty: Black Ops II",
    "call of duty 4": "Call of Duty 4: Modern Warfare",
    "dead space 3": "Dead Space 3",
    "devil may cry 3 special edition": "Devil May Cry 3: Special Edition",
    "dirt 3 complete edition": "DiRT 3: Complete Edition",
    "dirt showdown": "DiRT Showdown",
    "far cry 2 fortune's edition": "Far Cry 2: Fortune's Edition",
    "far cry 3 duology": "Far Cry 3",
    "far cry 4 gold edition": "Far Cry 4: Gold Edition",
    "ghost of tsushima": "Ghost of Tsushima",
    "god of war": "God of War",
    "hitman absolution": "Hitman: Absolution",
    "hellblade": "Hellblade: Senua's Sacrifice",
    "injustice gods among us": "Injustice: Gods Among Us",
    "just cause 2": "Just Cause 2",
    "just cause 3 xl edition": "Just Cause 3: XL Edition",
    "lego star wars the skywalker saga": "LEGO Star Wars: The Skywalker Saga",
    "lego marvel super heroes 2": "LEGO Marvel Super Heroes 2",
    "lego dc super villains": "LEGO DC Super-Villains",
    "mad max": "Mad Max",
    "medal of honour": "Medal of Honor",
    "metal gear solid v tpp": "Metal Gear Solid V: The Phantom Pain",
    "naruto shippuden ultimate ninja storm 4": "Naruto Shippuden: Ultimate Ninja Storm 4",
    "naruto x boruto ultimate ninja storm connections": "Naruto x Boruto: Ultimate Ninja Storm Connections",
    "ryse son of rome": "Ryse: Son of Rome",
    "shadow of the tomb raider": "Shadow of the Tomb Raider",
    "sleeping dogs pack": "Sleeping Dogs: Definitive Edition",
    "sonic all stars racing transformed": "Sonic & All-Stars Racing Transformed",
    "split second": "Split/Second",
    "tom clancy ghost recon wildlands": "Tom Clancy's Ghost Recon: Wildlands",
    "tom clancy's splinter cell conviction": "Tom Clancy's Splinter Cell: Conviction",
    "the walking dead a new frontier": "The Walking Dead: A New Frontier",
    "watch dogs 2": "Watch Dogs 2",
    "watchdogs legion": "Watch Dogs: Legion",
    "red dead redemption 2": "Red Dead Redemption 2",
    "need for speed most wanted 2012": "Need for Speed: Most Wanted (2012)",
    "need for speed most wanted": "Need for Speed: Most Wanted (2005)",
    "need for speed heat": "Need for Speed Heat",
    "gears 5": "Gears 5",
    "gear 5": "Gears 5",
    "dragon ball sparking zero": "Dragon Ball: Sparking! ZERO",
    "wonderland secret worlds": "Wonderland: Secret Worlds",
    "ryse son of rome": "Ryse: Son of Rome",
    "assassin's creed 2": "Assassin's Creed II",
}

SERIES = [
    ("assassin's creed", "Assassin's Creed"), ("batman", "Batman: Arkham"),
    ("battlefield", "Battlefield"), ("call of duty", "Call of Duty"),
    ("crysis", "Crysis"), ("dead space", "Dead Space"), ("devil may cry", "Devil May Cry"),
    ("dirt", "DiRT"), ("far cry", "Far Cry"), ("fifa", "EA Sports FC / FIFA"),
    ("grand theft auto", "Grand Theft Auto"), ("gta", "Grand Theft Auto"),
    ("injustice", "Injustice"), ("just cause", "Just Cause"), ("lego", "LEGO"),
    ("mafia", "Mafia"), ("marvel", "Marvel"), ("spider-man", "Marvel's Spider-Man"),
    ("metal gear", "Metal Gear Solid"), ("need for speed", "Need for Speed"),
    ("naruto", "Naruto"), ("resident evil", "Resident Evil"),
    ("saints row", "Saints Row"), ("tomb raider", "Tomb Raider"),
    ("walking dead", "The Walking Dead"), ("watch dogs", "Watch Dogs"),
    ("watchdogs", "Watch Dogs"), ("pro evolution soccer", "Pro Evolution Soccer"),
    ("efootball", "eFootball"), ("deadpool", "Deadpool"), ("tekken", "Tekken"),
    ("max payne", "Max Payne"), ("sniper ghost warrior", "Sniper: Ghost Warrior"),
]

GENRES = {
    "assassin's creed": "OPEN_WORLD", "batman": "ACTION", "battlefield": "SHOOTER",
    "call of duty": "SHOOTER", "crysis": "SHOOTER", "dead space": "HORROR",
    "devil may cry": "ACTION", "dirt": "RACING", "far cry": "OPEN_WORLD",
    "fifa": "SPORTS", "grand theft auto": "OPEN_WORLD", "gta": "OPEN_WORLD",
    "injustice": "FIGHTING", "just cause": "OPEN_WORLD", "lego": "FAMILY",
    "mafia": "ACTION", "marvel": "ACTION", "spider-man": "ACTION",
    "metal gear": "ACTION", "need for speed": "RACING", "naruto": "FIGHTING",
    "resident evil": "HORROR", "saints row": "OPEN_WORLD", "tomb raider": "ADVENTURE",
    "walking dead": "ADVENTURE", "watch dogs": "OPEN_WORLD",
    "pro evolution soccer": "SPORTS", "efootball": "SPORTS", "tekken": "FIGHTING",
    "max payne": "ACTION", "sniper ghost warrior": "SHOOTER", "deadpool": "ACTION",
    "dragon ball": "FIGHTING", "football manager": "SIMULATION", "forza": "RACING",
    "god of war": "ACTION", "ghost of tsushima": "OPEN_WORLD", "gotham knights": "ACTION",
    "hellblade": "ADVENTURE", "hitman": "ACTION", "horizon": "OPEN_WORLD",
    "mad max": "OPEN_WORLD", "biomutant": "RPG", "bioshock": "SHOOTER",
    "castlevania": "ACTION", "control": "ACTION", "cyberpunk": "RPG",
    "days gone": "OPEN_WORLD", "detroit": "ADVENTURE", "red dead": "OPEN_WORLD",
    "ryse": "ACTION", "sifu": "ACTION", "sleeping dogs": "OPEN_WORLD",
    "sonic": "FAMILY", "titanfall": "SHOOTER", "wolf among us": "ADVENTURE",
    "wonderland": "FAMILY", "xpand rally": "RACING", "split second": "RACING",
    "insane": "RACING", "inversion": "SHOOTER", "medal of honour": "SHOOTER",
    "ultimate marvel": "FIGHTING", "wanted": "ACTION", "blur": "RACING",
    "last of us": "ACTION", "silent": "HORROR", "metal gear solid": "ACTION",
}

PLATFORMS_BY_GENRE = {
    "SPORTS": ["PC"], "RACING": ["PC"], "FIGHTING": ["PC"], "FAMILY": ["PC"],
}

def clean(name: str) -> str | None:
    s = name.strip()
    if not s:
        return None
    # Strip a leading list index if the PDF text carried one.
    s = re.sub(r"^\d+\.\s*", "", s)
    for pat in NOISE:
        s = re.sub(pat, " ", s, flags=re.IGNORECASE)
    s = s.replace("_", " ").replace(".", " ")
    s = re.sub(r"\s{2,}", " ", s).strip(" -–—:|")
    if not s or len(s) < 2:
        return None
    key = re.sub(r"[^a-z0-9]", "", s.lower())
    if key in {re.sub(r"[^a-z0-9]", "", n) for n in NON_TITLES}:
        return None
    if ":" not in s:
        s = s.title()
        s = re.sub(r"\bIi\b", "II", s)
        s = re.sub(r"\bIii\b", "III", s)
        s = re.sub(r"\bIv\b", "IV", s)
        s = re.sub(r"\bV\b", "V", s)
    s = s.replace("'S", "'s").replace("’S", "’s")
    return s

_ALNUM = re.compile(r"[^a-z0-9]")
_RENAME_MAP = {_ALNUM.sub("", k.lower()): v for k, v in RENAMES.items()}

def canonical(name: str) -> str | None:
    """Map a raw listing label onto its real product name."""
    return _RENAME_MAP.get(_ALNUM.sub("", name.lower()), name)

def series_of(name: str) -> str | None:
    low = name.lower()
    for needle, label in SERIES:
        if needle in low:
            return label
    return None

def genre_of(name: str, series: str | None) -> str:
    low = name.lower()
    if series and series.lower() in GENRES:
        return GENRES[series.lower()]
    for needle, g in GENRES.items():
        if needle in low:
            return g
    return "ACTION"

reader = pypdf.PdfReader(RAW)
text = "\n".join(p.extract_text() for p in reader.pages)

seen, out = set(), []
for line in text.splitlines():
    line = line.strip()
    if not re.match(r"^\d+\.", line):
        continue
    candidate = clean(line)
    if not candidate:
        continue
    candidate = canonical(candidate)
    if not candidate:
        continue
    candidate = re.sub(r"\s{2,}", " ", candidate).strip()
    key = re.sub(r"[^a-z0-9]", "", candidate.lower())
    if not key or key in seen:
        continue
    seen.add(key)
    series = series_of(candidate)
    genre = genre_of(candidate, series)
    slug = re.sub(r"^-+|-+$", "", re.sub(r"[^a-z0-9]+", "-", unicodedata.normalize("NFKD", candidate).encode("ascii", "ignore").decode().lower()))
    out.append({"name": candidate, "slug": slug, "series": series, "genre": genre,
                "platforms": PLATFORMS_BY_GENRE.get(genre, ["PC"])})

out.sort(key=lambda t: t["name"])
with open("/home/user/arkvolt/apps/api/prisma/titles.json", "w") as f:
    json.dump(out, f, indent=1)

print(f"{len(out)} clean titles")
for g in sorted({t['genre'] for t in out}):
    print(f"  {g:14s} {sum(1 for t in out if t['genre']==g):3d}")
print()
for t in out[:12]:
    print(" ", t["name"], "|", t["series"], "|", t["genre"])
