# Nightprint — plan de projet

> Copie du doc Claude « Nightprint — plan de projet » (12/10/2026). Le doc Claude est la version
> qu'on édite ; ce fichier suit. Les agents qui codent dans ce repo le lisent avant d'ajouter une
> fonctionnalité : ce qui est hors du scope v1 attend le lancement.

Nightprint montre l'architecture logicielle sous forme de machines 3D qu'on fait tourner dans le navigateur. Le but : apprendre la vraie 3D et exposer un projet public, sans objectif de revenu. Le lancement se fait avec une seule machine, l'architecture hexagonale (MCH-001), après trois week-ends de build ; ensuite, une machine par semaine.

## Le projet

Nightprint (nightprint.dev) est un site où chaque concept d'architecture devient une machine 3D animée. On regarde une vraie requête la traverser étape par étape, puis on agit dessus (« et si… ») pour voir ce que le concept protège.

**Une machine, c'est :**

- une scène 3D en « dessin d'ingénieur, de nuit » : fond sombre, arêtes fines, quatre couleurs de flux ;
- un scénario guidé (7 étapes pour MCH-001), avec barre de transport et journal d'événements ;
- des interrupteurs « et si… » nommés comme des cas de test (« Swap Postgres for InMemory ») ;
- une nomenclature numérotée et un cartouche, comme sur un plan d'assemblage ;
- un article court, 5 paragraphes au plus, avec ses sources.

**Pour qui.** Les développeurs qui veulent comprendre pourquoi un pattern existe, pas seulement à quoi il ressemble. Le site est en anglais.

**Ce qui le distingue.** Les explications existantes sont des articles 2D (Ben Dicken, Sam Rose), des machines SVG générées par IA (Anatomy), des simulateurs d'infra ou des schémas statiques. Aucune ne combine vraie 3D, patterns d'architecture logicielle, scénarios guidés et actions « et si… ».

**Catalogue prévu.** Backend (hexagonale, DDD, CQRS + event sourcing), frontend (event loop, rendu React), mobile (offline-first), infra (Redis cache-aside, Kafka).

## Buts

Nightprint sert trois buts, dans cet ordre. Il n'a pas d'objectif de revenu.

1. **Apprendre la vraie 3D dans le navigateur** : React Three Fiber avec WebGPU, TSL (arêtes, bloom, faux verre, coupes), des pièces générées par le code, et la conception d'un moteur de scénarios typé.
2. **Un projet public pour le portfolio** : il montre l'architecture (le site respecte la règle hexagonale qu'il explique), la 3D et un design system complet.
3. **Du contenu build in public** : X en anglais, LinkedIn en français.

**Hors objectifs** : revenu, comptes utilisateurs, génération de machines par IA en v1, couvrir tous les concepts.

**Critères de réussite (adoptés tels quels au lancement, état au 13/10)**

- [x] MCH-001 en ligne sur nightprint.dev, jouable de bout en bout sur Chrome et Safari, desktop et mobile, sans erreur en console. Vérifié sans erreur en émulation (moteurs de Chrome et de Safari, ordinateur et mobile, de 320 px à 1440 px), et sur un vrai téléphone le 13/10. Chrome sur ordinateur avec un vrai GPU n'a pas été essayé, faute de Chrome sous la main (13/10).
- [x] MCH-001 relue contre Cockburn (2005), et contre Cockburn et Garrido de Paz (2024) ; les deux sources sont citées sur la page.
- [x] `pnpm check` vert à chaque commit : lint, types, tests, contraste AA. Chaque commit est vérifié seul, et la CI le rejoue avant chaque déploiement.
- [ ] Après le lancement, une machine finie par semaine, jamais deux commencées en même temps. À partir de MCH-002.
- [ ] Un post X et un post LinkedIn par machine. MCH-001 : fil X du 12/10 (vidéo, lien, sondage MCH-003).

## Scope v1

La v1, c'est le moteur et une seule machine excellente, MCH-001. Tout le reste attend le lancement.

| Élément | Statut | Où en est-on |
| --- | --- | --- |
| Moteur de scénarios : schéma zod, résolution des actions, player déterministe | v1 | Fait, 36 tests |
| MCH-001 hexagonale : 7 étapes, 2 interrupteurs, nomenclature, journal, cartouche, article | v1 | Lancée le 12/10 : 3 scénarios, 3 interrupteurs, vue éclatée, pièces générées par le code |
| Design system en atomic design : tokens et 25 composants | v1 | Fait, publié en artifact |
| Pièces Blender en glTF : cœur en verre, ports, 5 adaptateurs, plaque | Après le lancement, à l'essai | Les pièces restent générées par le code ; une seule pièce vedette (le cœur en verre) à l'essai, gardée seulement si elle rend mieux |
| Caméra entre les étapes, cotes de latence, étincelles de violation | v1 | Fait (12/10) |
| Bloom et arêtes en TSL, vue éclatée, coupe hachurée | v1 | Fait (12/10). Vue éclatée : « Unplug the adapters » débranche chaque adaptateur de son port ; celui que le cœur importe reste collé |
| Catalogue avec les machines à venir grisées | v1 | Fait, avec un vote sur X pour la suivante |
| Accessibilité : clavier, réduction des animations, contraste AA testé | v1 | En place |
| SEO : tout le texte en HTML, JSON-LD, image de partage par machine, sitemap | v1 | Fait ; Search Console et Bing vérifiés le 12/10 |
| Vidéo de lancement pour X et LinkedIn | v1 | Publiée : `apps/video` filme le site image par image, Remotion monte ; final « Unplug the adapters » ajouté le 13/10 |
| Site statique sur le VPS, domaine nightprint.dev | v1 | En ligne sur nightprint.dev (12/10), publié à chaque push sur main ; www et l'ancienne adresse sslip.io de préversion redirigent vers l'apex |
| Machines MCH-002 à MCH-008 | Après le lancement | Une par semaine ; MCH-002 (event loop JavaScript) et MCH-003 (Redis cache-aside) publiées le 13/10 |
| Export vidéo intégré (WebCodecs) | Après le lancement | Au lancement, la vidéo vient d'`apps/video` |
| Planche de concepts : grille de mini-machines animées | À trancher, après MCH-003 | Voir les décisions ouvertes |
| Génération d'une machine par IA à partir d'une phrase | v2 | Claude écrit une définition à partir du kit |
| Éditeur de code intégré (snippet de l'event loop) | v2 | Après le catalogue de base |
| Éditeur visuel, comptes utilisateurs, thème clair | Coupé | Rien de tout ça au lancement |

## Roadmap

Le plan prévoyait trois week-ends de build et un lancement autour du 1er novembre. MCH-001 est lancée le 12/10. Ensuite, une machine par semaine.

1. **Fait (11 et 12 octobre)** : cadrage, DA, rendu test Blender, nom ; repo (moteur, catalogue, scène, UI, tokens) ; nightprint.dev acheté et en ligne, publié à chaque push ; MCH-001 jouable de bout en bout avec caméra entre les étapes, cotes de latence, étincelles de violation, bloom et arêtes en TSL, coupe hachurée ; catalogue avec vote sur X ; SEO, Search Console et Bing ; vidéo de lancement ; licence ; 119 tests.
2. **Lancement (12 et 13 octobre)** : relecture contre Cockburn (2005 et 2024), corrections en ligne ; vue éclatée ; section « Every scenario, in words » refaite, chaque étape rejouable depuis sa ligne ; essai automatisé sans erreur sur les moteurs de Chrome et de Safari, ordinateur et mobile émulé (WebGPU sous Safari), pages tenues dès 320 px ; vidéo avec le final « Unplug ».
   **MCH-001 lancée le 12/10** : fil X avec la vidéo, le lien et le sondage pour MCH-003. Essai sur un vrai téléphone concluant le 13/10.
3. **Ensuite, une machine par semaine** : MCH-002 event loop JavaScript (publiée le 13/10 : un script qui affiche A, D, C, B, et trois interrupteurs : pile bloquée 200 ms, microtâches sans fin, timeouts sans fin ; relue contre la spécification HTML) → MCH-003 Redis cache-aside (publiée le 13/10 ; la question posée sur X n'a reçu aucun vote, choix d'Ewen) → MCH-004 DDD → 005 offline-first → 006 CQRS + event sourcing → 007 rendu React → 008 Kafka.

Chaque week-end se termine par une livraison en ligne. L'ordre des machines après le lancement est indicatif.

**Candidates pour un prochain sondage** (13/10), sans rien changer à l'ordre en cours :

- **Webhook idempotent** : un fournisseur de paiement renvoie le même événement après un délai d'expiration. Interrupteurs : sans clé de dédoublonnage (crédité deux fois) ; clé réservée mais jamais libérée en cas d'échec (le renvoi est perdu) ; empreinte prise sur chaque événement (un remboursement est avalé). Source : le brouillon IETF « The Idempotency-Key HTTP Header Field ».
- **Délestage et réponse partielle** : un service lent ; on rejette d'abord les requêtes spéculatives, puis on répond avec ce qui est prêt à l'échéance. Source : Google SRE, « Handling Overload ».
- **Rotation des jetons de rafraîchissement** : jeton d'accès court, jeton de rafraîchissement remplacé à chaque usage. Interrupteur : un seul jeton partagé entre deux applications, qui déconnecte partout. Source : RFC 9700 (OAuth 2.0 Security Best Current Practice).

Le dédoublonnage des requêtes est devenu l'interrupteur « Expire a hot key under load » de MCH-003 (13/10). Redis n'a pas de « stale-while-revalidate » intégré : servir du périmé pendant le rafraîchissement reste du code applicatif, à montrer comme tel si on y revient.

## Architecture et stack

Un monorepo de cinq paquets et deux apps, le site et les vidéos. La règle hexagonale que le site explique, il l'applique : le moteur ne connaît ni React, ni three, ni le DOM, et les `package.json` l'imposent.

```mermaid
graph TD
  web["apps/web<br/>routes, MachineView, machine-view-model.ts"] --> catalog["packages/catalog<br/>les machines, en données"]
  web --> scene["packages/scene<br/>scène R3F, calque DOM des repères"]
  web --> ui["packages/ui<br/>design system atomic"]
  catalog --> engine["packages/engine<br/>schéma, résolution, player · zod seulement"]
  scene --> engine
  scene --> ui
  scene --> tokens["packages/tokens<br/>couleurs, typo, scène"]
  ui --> tokens
  video["apps/video<br/>vidéos X et LinkedIn, Remotion"] --> tokens
```

Flèche = « importe ». `apps/web` importe aussi `engine` et `tokens` directement. Le détail est dans `CLAUDE.md`.

| Brique | Choix | Pourquoi |
| --- | --- | --- |
| Monorepo | pnpm 10.28 + Turborepo 2.11 | Les `package.json` imposent les frontières entre paquets |
| Site | Next.js 16.4, App Router, export statique | Une page HTML par machine, ni base ni comptes |
| 3D | React Three Fiber 9.8 + three 0.186, `WebGPURenderer` | Repli WebGL2 automatique ; R3F v10 encore en alpha |
| Langage | TypeScript 6.0.3 | TS 7 n'a plus l'API JS dont `next build` a besoin pour typer |
| Données | zod 4 | Machines validées au chargement |
| Tests et lint | Vitest 5, Biome 2 | 119 tests ; Biome remplace ESLint et Prettier |
| Styles | Tailwind 4, palette par défaut supprimée | Seules les couleurs de la DA existent |
| Polices | IBM Plex Sans et Mono, auto-hébergées | Build hors ligne, licence OFL |
| Hébergement | VPS perso, site statique derrière Caddy | Publié par GitHub Actions à chaque push sur main |

## Règles du projet

Quand un choix hésite, ces règles tranchent. Elles sont détaillées dans `CLAUDE.md` et le skill `nightprint-conventions`.

1. **Une machine est une donnée.** Un fichier dans `packages/catalog`, validé par zod pour chaque combinaison d'interrupteurs : une étape cassée casse le build.
2. **La 2e machine dicte l'abstraction.** Aucune fonctionnalité de schéma « pour plus tard ».
3. **L'exactitude d'abord.** Chaque machine cite une référence et ne suggère jamais un comportement que le vrai système n'a pas.
4. **Le temps vit dans le moteur.** Pas fixe de 1/60 s, aucune valeur par image dans l'état React.
5. **Rendu compatible WebGPU.** Matériaux natifs ou nodes, TSL ; ni GLSL ni `@react-three/postprocessing` ; repères en DOM au-dessus du canvas.
6. **Les tokens seulement.** Quatre couleurs de flux ; le vermillon est réservé aux erreurs et aux violations.
7. **Atomic design pour l'interface.** Atomes, molécules, organismes, templates, pages ; `ui` ne connaît pas le moteur.
8. **Contenu public générique.** Exemples métier (commande, paiement), aucun nom d'entreprise, de produit ou de client réel ; noms de technos en texte, pas de logos.
9. **Une machine finie par semaine**, pas cinq commencées.

## Build in public

Le build se raconte en anglais sur X et en français sur LinkedIn ; chaque machine donne au moins un post.

- **Lancement** : la vidéo de MCH-001, centrée sur le déclic « je remplace Postgres, le cœur ne bouge pas ». Anatomy est cité comme inspiration dès ce premier post.
- **Série « une machine par semaine »** : le concept en une phrase, la vidéo, l'interrupteur qui fait comprendre.
- **Coulisses** : une pièce générée par le code, de sa définition à l'écran ; plus tard, le cœur en verre refait dans Blender face à sa version en code ; pourquoi la vraie 3D plutôt que le SVG ; la coupe hachurée en TSL.
- **Angles déjà tirés du build** :
  - le site respecte la règle hexagonale qu'il explique, et le compilateur l'impose ;
  - « j'ai failli publier un contre-exemple faux » : contourner un port n'inverse pas une dépendance ;
  - pourquoi pas TypeScript 7 dans un projet Next.js en octobre 2026 ;
  - une machine = un fichier de données, validé pour les 2^n combinaisons d'interrupteurs ;
  - pas fixe de 1/60 s, donc export vidéo exact image par image ;
  - palette Tailwind supprimée, contraste testé en CI ;
  - drei `<Html>` + Strict Mode = 9 erreurs React par page, remplacé par un calque DOM.
- **Interaction** : demander en réponse quel concept devient la machine suivante.
- **Réseau** : Ben Dicken, Sam Rose et l'auteur d'Anatomy font le même métier d'explication. Les citer, leur répondre avec les machines, ne pas les copier.

## Risques et garde-fous

Le plus gros risque n'est pas technique : c'est un projet d'apprentissage sans problème vécu derrière, qui doit tenir sur des soirs et des week-ends.

| Risque | Garde-fou |
| --- | --- |
| La motivation retombe, faute de problème vécu à résoudre | Scope court, une livraison visible par week-end, un post à chaque étape |
| Le temps manque (soirs et week-ends) | MVP en 3 week-ends, rien hors scope avant le lancement |
| Le catalogue gonfle | Une machine finie par semaine, dans l'ordre fixé |
| Le moteur devient générique trop tôt | Il s'extrait de la 1re et de la 2e machine, pas avant |
| Un schéma faux se fait démonter | Relecture contre une source de référence, sources citées sur la page |
| La métaphore trompe | La machine ne suggère jamais un comportement faux pour faire joli |
| WebGPU instable (erreur `swizzle` vue dans Chromium headless) | Tester Chrome et Safari réels ; forcer WebGL2 si un bug bloque plus d'une soirée |
| Trop proche d'Anatomy ou d'ISO-GLOW | Signatures propres : repères, nomenclature, cotes, coupe, cartouche ; ni leur code, ni leur palette |
| Mobile trop lent (verre, bloom) | Faux verre (fresnel + transparence), bloom discret, test sur téléphone |

## Décisions ouvertes et prochaines actions

Une décision reste à prendre, plus tard ; une action reste à faire.

- [ ] **Planche de concepts** : vitrine des 8 machines complètes, ou format à part avec beaucoup de petits concepts (DNS, CDN, load balancer…) dont certains deviennent des machines ? Reportée après MCH-003 (13/10) : rien de neuf tant que le rythme d'une machine par semaine n'est pas tenu.
- [x] **Pièces Blender** : hors du lancement (décidé le 12/10). Une pièce générée par le code reste une donnée de la machine : chaque nouvelle machine reste un seul fichier, compatible avec « une par semaine », et ses arêtes restent nettes dans le style dessin technique. Après le lancement, le cœur en verre à l'essai dans Blender.
- [x] **Compte X** : le compte perso, [@ewenlq](https://x.com/ewenlq) (décidé le 12/10). Il signe les pages (auteur, carte X) et le journal de build y renvoie.
- [x] **Repo** : public sur GitHub, [Ewen02/nightprint](https://github.com/Ewen02/nightprint) (décidé le 12/10). Licence : MIT pour le code, CC BY 4.0 pour le contenu, c'est-à-dire les machines, `art/` et les vidéos (décidé le 12/10).
- [x] Acheter nightprint.dev (12/10), DNS chez IONOS vers le VPS, certificat Let's Encrypt émis le jour même.
- [x] Vérifier WebGPU dans Chrome et Safari réels : le moteur de Safari tourne en WebGPU sans erreur ; Chrome avec un vrai GPU laissé de côté, faute de Chrome (13/10).
- [x] `git init` et premiers commits, atomiques (12/10).
- [x] ~~Storyboard Excalidraw de MCH-001~~ : abandonné (13/10), la machine jouable et la vidéo l'ont remplacé.
- [x] Critères de réussite de la section Buts : adoptés tels quels au lancement (13/10), cochés au fil de l'eau.

## Démarrer dans le repo

Il faut Node 22.12 ou plus et pnpm 10.

```bash
pnpm install   # dépendances
pnpm dev       # construit les tokens, puis next dev
pnpm check     # Biome + types + tests, avant chaque commit
pnpm build     # export statique dans apps/web/out
```

- **À lire d'abord** : `CLAUDE.md` (règles, versions, docs embarquées de Next.js et Turborepo), puis `.claude/skills/nightprint-conventions`.
- **Ajouter une machine** : un fichier dans `packages/catalog/src` et une ligne dans `index.ts`. `pnpm check` la rejoue pour chaque combinaison d'interrupteurs.
- **Ajouter un composant** : au bon niveau de `packages/ui/src` (atoms, molecules, organisms, templates), avec des props simples, puis `pnpm --filter @nightprint/ui design-system` pour régénérer l'artifact du design system.
