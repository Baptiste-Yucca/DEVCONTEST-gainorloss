# RMMGain Dashboard

Une application dashboard pour visualiser les données du protocole RMM sur la blockchain Gnosis.

## Fonctionnalités

- Recherche par adresse wallet (format EVM)
- Visualisation des transactions de dépôt de liquidités (supplies)
- Visualisation des transactions de retrait de liquidités (withdraws)
- Visualisation des transactions d'emprunt (borrows)
- Visualisation des transactions de remboursement (repays)
- Formatage des montants au format humain
- Support des tokens USDC et WXDAI

## Prérequis

- Node.js (v14 ou supérieur)
- Yarn

## Installation

1. Clonez le dépôt :
```bash
git clone <url-du-depot>
cd rmmgain
```

2. Installez les dépendances :
```bash
yarn install
```

3. Configurez les variables d'environnement :
Créez un fichier `.env.local` à la racine du projet et ajoutez les variables suivantes :

```
NEXT_PUBLIC_GNOSISSCAN_API_KEY=votre_clef_gnosisscan
NEXT_PUBLIC_THEGRAPH_API_URL=votre_url_thegraph
```

## Développement

Pour lancer le serveur de développement :

```bash
yarn dev
```

L'application sera disponible à l'adresse [http://localhost:3000](http://localhost:3000).

## Production

Pour construire l'application pour la production :

```bash
yarn build
```

Pour lancer l'application en mode production :

```bash
yarn start
```

## Structure du projet

- `components/` : Composants React réutilisables
- `pages/` : Pages de l'application
- `utils/` : Utilitaires et fonctions d'aide
- `graphql-queries/` : Requêtes GraphQL pour TheGraph
- `styles/` : Fichiers de style
- `public/` : Assets statiques

## Tokens

L'application gère les tokens suivants sur la blockchain Gnosis :

- USDC : 0xddafbb505ad214d7b80b1f830fccc89b60fb7a83 (6 décimales)
- armmUSDC : 0xeD56F76E9cBC6A64b821e9c016eAFbd3db5436D1 (token rémunérateur)
- debtUSDC : 0x69c731aE5f5356a779f44C355aBB685d84e5E9e6 (token de dette)
- WXDAI : 0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d (18 décimales)
- armmWXDAI : 0x0cA4f5554Dd9Da6217d62D8df2816c82bba4157b (token rémunérateur)
- debtWXDAI : 0x9908801dF7902675C3FEDD6Fea0294D18D5d5d34 (token de dette) 