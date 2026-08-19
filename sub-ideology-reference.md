# Sub-Ideology Reference List — 13 Buckets

## Project Goal (context for a new chat)

Building a standalone HTML political ideology test — deeper and more diverse than
existing tests (8values, Political Compass, LeftValues, etc.) — for hosting on Discord
or elsewhere.

**Architecture — two modules:**
- **Module 1 (Bucket Test):** ~60 questions across 6 *structural* axes — Economic
  (Equality↔Markets), Authority (Liberty↔Authority), Solidarity Basis (Class↔Nation),
  Change Orientation (Revolutionary↔Reactionary), Legitimacy (Secular↔Religious), and
  Imperial Orientation (Anti-imperialist↔Expansionist). Routes the respondent into one
  of the 13 ideological family buckets below.
- **Module 2 (Tendency Test):** a bucket-specific battery, hand-designed per bucket,
  scoring 8 axes unique to that ideological family (e.g. ML's axes include Revolutionary
  Site, Vanguard Discipline, AES Orthodoxy, etc. — already drafted, see project history).
  Density: **deep — 12 questions per axis, 96 questions per bucket** (~1,248 questions
  total across all 13 buckets once complete).

**Results page:** a radar chart with the bucket's 8 vertices plotted, plus:
- A center hub badge showing the Module 1 bucket + a flavor sub-tendency label (e.g.
  "Stalinist-Orthodox, Third-Worldist Lean," derived from axis scores).
- **Social progressivism is explicitly orthogonal** — never used to route Module 1, never
  one of the 8 radar vertices. It's shown as a separate universal "appendage" stat outside
  the radar (a single Traditionalist↔Progressive slider), since it can vary independently
  within every bucket (an ML can be culturally conservative or progressive; same for every
  other bucket).
- Visual direction locked: a "classified dossier" aesthetic (manila paper, navy ink rules,
  a rotated red ink-stamp for the verdict, typewriter/serif/mono type trio) — deliberately
  not a generic dark-mode dashboard or cream+terracotta SaaS look. A working mockup exists
  (`results-mockup.html`) using ML sample data.

**Buckets close calls to remember:**
- Syndicalism is NOT its own bucket — it's an "Organizational Vehicle" axis inside
  Anarchism's Module 2 (existing tests + reference sources agree it's a strategy, not a
  standalone ideology).
- Technocracy bucket was cut (too niche/thin); its one salvageable entry
  (Neoreactionary Techno-Commercialism) was folded into Neo-Eurasianism instead.
- Overlapping/hybrid sub-ideologies (Juche, National Bolshevism, Objectivism, etc.) are
  intentionally cross-listed between buckets rather than forced into one home.

**Status:** Module 1's 6 axes are settled. ML's 8 Module 2 axes are fully drafted (see
project history). The other 12 buckets' axes still need drafting using the same
methodology: check the bucket's sub-ideology list below for coverage, aim for axes that
cleanly separate every named sub-ideology, avoid smuggling the cultural/progressivism
axis in disguise.

> **Note (this session, 2026-08-18):** the above "Status" paragraph is now stale. Per
> `MODULE2-NOTES.md` (pulled from `KEY.zip`), all 13 buckets have full 96-question Module
> 2 batteries drafted and passing validation. See that file for current status and
> `what remains`.

---

Working reference for Module 2 design. Sub-ideologies marked **(×)** are cross-cutting —
they genuinely belong to more than one bucket depending on emphasis, and should probably
be reachable from either bucket's Module 2 rather than forced into one home.

---

## 1. Marxism-Leninism / Communism (state-socialist family)
- Marxism-Leninism (orthodox/Stalinist)
- Trotskyism / Left Opposition
- Maoism
- Marxism-Leninism-Maoism (MLM / "Gonzalo Thought")
- Hoxhaism (Anti-Revisionist)
- Titoism (Yugoslav self-management model)
- Castro-Guevarism **(×** also Third-Worldism)
- Ho Chi Minh Thought
- Kim Il-Sungism **(×** also Third-Worldism — see bucket 12)
- Prachanda Path (Nepalese Maoism)
- Dengism / Reform Communism (market-socialist)
- Khrushchevism / De-Stalinization Reform Communism
- Brezhnevism / Developed Socialism
- Eurocommunism
- Naxalism (Indian Maoist insurgency current)
- National Bolshevism **(×** also bucket 14)
- Barracks Communism (pejorative for crude egalitarian-authoritarian communism)
- Posadism (Trotskyist UFO/nuclear-war current, half-serious meme entry but real historical tendency)

## 2. Left-Communism / Communization
- Council Communism (Pannekoek, Gorter)
- Bordigism (Italian Left)
- Luxemburgism
- Communization Theory (Théorie Communiste, Endnotes)
- Autonomism / Operaismo (Negri, Tronti)
- Situationism (Debord, SI)
- De Leonism (industrial unionism + party)
- Impossibilism (SPGB tradition — no reform, only revolution)
- Council-ist Trotskyism (Castoriadis/Socialisme ou Barbarie)
- Ultra-leftism (general umbrella term used by ML critics of the above)
- Insurrectionary Communism / Anti-Work current

## 3. Anarchism
- Anarcho-Communism (Kropotkin)
- Anarcho-Syndicalism (union-vehicle strategy)
- Collectivist Anarchism (Bakunin)
- Mutualism (Proudhon)
- Individualist Anarchism (Stirner, Tucker)
- Platformism (Makhno/Arshinov "Organizational Platform")
- Especifismo (Latin American platformist current)
- Green Anarchism / Eco-Anarchism
- Anarcho-Primitivism (Zerzan)
- Social Ecology / Communalism (Bookchin)
- Post-Left Anarchy
- Insurrectionary Anarchism
- Anarcha-Feminism
- Christian Anarchism (Tolstoy)
- Anarcho-Pacifism
- Queer Anarchism
- Black Anarchism

## 4. Social Democracy / Democratic Socialism
- Classical Social Democracy (Bernstein/Kautsky revisionist tradition)
- Nordic Model Social Democracy
- Democratic Socialism (contemporary US/UK left-of-Labour current)
- Fabianism
- Austromarxism
- Guild Socialism
- Christian Socialism
- Market Socialism (Lange-Lerner model)
- Ethical Socialism (Tawney)
- Cooperative Socialism / Owenism
- Utopian Socialism (Fourier, Saint-Simon) — historical precursor, often bucketed here
- Labor Zionism **(×** nationalist-socialist hybrid)

## 5. Progressive / Social Liberalism
- New Deal Liberalism
- Rawlsian Liberalism (justice-as-fairness)
- Welfare Liberalism
- Third Way / Blairism **(×** also bucket 6)
- Green Liberalism
- Feminist Liberalism
- Multiculturalist Liberalism
- Civil Rights Liberalism
- Progressivism (US Progressive Era tradition)
- Radical Centrism

## 6. Classical / Market Liberalism
- Classical Liberalism (Locke, Smith)
- Neoliberalism
- Ordoliberalism (German social-market tradition)
- Manchester Liberalism (laissez-faire free trade)
- Georgism (land-value-tax liberalism)
- Austrian School Liberalism (minarchist-leaning, short of full ancap)
- Constitutional/Federalist Liberalism
- Objectivism (Rand) **(×** also bucket 11)

## 7. Conservatism
- Traditional/Burkean Conservatism
- Paleoconservatism
- Neoconservatism
- Fusionism (Reagan-era conservative-libertarian synthesis)
- One-Nation Conservatism / Toryism
- Christian Democracy
- National Conservatism
- Agrarian Conservatism
- Cultural/Social Conservatism
- Compassionate Conservatism
- Libertarian Conservatism
- Communitarian Conservatism (e.g. "Blue Labour"-style)

## 8. Fascism / Third Position / National-Populism
- Italian Fascism (Mussolini)
- Nazism / National Socialism
- Falangism (Spain)
- Austrofascism
- Iron Guard / Legionarism (Romania)
- Francoism
- Strasserism (anti-capitalist "left" Nazism)
- Third Position (general umbrella)
- National Syndicalism
- Integralism (Brazil/Portugal)
- Clerical Fascism
- Shōwa Statism (Imperial Japan ultranationalism)
- Ecofascism
- Contemporary National-Populism (distinguished from historical fascism by rejecting paramilitary/one-party form while keeping ethno-nationalist core)

## 9. Monarchism / Reaction
- Absolute Monarchism
- Constitutional Monarchism
- Legitimism (French Bourbon claim)
- Orleanism (French rival monarchist claim)
- Carlism (Spain)
- Jacobitism (Stuart claim)
- Bonapartism (populist-authoritarian monarchism-adjacent)
- Tsarist Restorationism
- Throne-and-Altar Traditionalism
- Neo-Reaction / "Dark Enlightenment" (Moldbug) **(×** also bucket 14)

## 10. Theocracy / Religious Fundamentalism
- Islamism (general political Islam)
- Salafism / Wahhabism
- Khomeinism (Vilayat-e Faqih — Iranian model)
- Muslim Brotherhood Islamism
- Salafi-Jihadism (distinct from non-violent political Salafism)
- Christian Dominionism
- Christian Reconstructionism
- Religious Zionism / Kahanism
- Hindutva
- Buddhist Nationalism (Sinhalese, Myanmar variants)
- Catholic Integralism **(×** also bucket 9)
- Deobandi / Barelvi political currents (South Asian Islamist variants)

## 11. Anarcho-Capitalism / Right-Libertarianism
- Anarcho-Capitalism (Rothbard)
- Minarchism (night-watchman state)
- Agorism (Konkin — counter-economics)
- Paleolibertarianism
- Geolibertarianism
- Voluntaryism
- Right-Libertarianism (general, non-anarchist)
- Crypto-anarchism / Techno-libertarianism (contemporary)
- Objectivism (Rand) **(×** also bucket 6)

## 12. Third-Worldism / National Liberation
- Juche / Kim Il-Sungism **(×** also bucket 1)
- Ba'athism
- Nasserism
- Bolivarianism / Chavismo
- Sandinismo
- Zapatismo
- Pan-Africanism (Nkrumaism)
- Ujamaa / African Socialism (Nyerere)
- Négritude-Socialism (Senghor)
- Pan-Arabism
- Sankarism (Burkina Faso)
- Gaddafism / Third International Theory
- Maoist Third-Worldism (contemporary "Leading Light" current)
- Non-Aligned Movement developmentalism

## 13. Neo-Eurasianism / Traditionalism
- Duginism / Fourth Political Theory
- Classical Eurasianism (Trubetzkoy, Savitsky — 1920s émigré movement)
- Integral Traditionalism (Guénon, Evola)
- Conservative Revolutionary movement (Weimar — Moeller van den Bruck, Jünger)
- National Bolshevism **(×** also bucket 1)
- Identitarianism / European New Right (de Benoist, GRECE)
- Neo-Reaction / "Dark Enlightenment" **(×** also bucket 9)
- Neoreactionary Techno-Commercialism ("Patchwork" corporate-state model)
- Traditionalist Catholicism **(×** also bucket 10)

---

**Total: 13 buckets, ~125 named sub-ideologies (with ~13 cross-listed).**

This list feeds two things later: (1) flavor-text sub-tendency labels shown alongside
each bucket's radar result (the way "Stalinist-Orthodox, Third-Worldist Lean" was
generated from the ML axis scores), and (2) a sanity check when drafting each bucket's
8 axes — every named sub-ideology below should be *placeable* somewhere on that bucket's
radar, or the axis set is missing something.
