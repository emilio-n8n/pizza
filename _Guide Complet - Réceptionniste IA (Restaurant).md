# **Guide Complet \- Réceptionniste IA (Restaurant)**

## Ressource Skool Gratuite par Yassine Sdiri![][image1]

[**Rejoignez la communauté**](https://www.skool.com/ia-school-6161/about) **| [YouTube](https://www.youtube.com/channel/UC94UeaPuTt_L51RkDxj9d_w)** 

## **Overview 👋🏼**

1. Présentation du Système  
2. Prompt Vapi  
3. Exemple Base de Donnée  
4. Automatisations Make.com	

## **Voir la Vidéo 📹**

![][image2]

[**Regardez ici**](https://www.youtube.com/watch?v=UjG4MPc59Go)

---

## **1\. Réceptionnistes Virtuels IA pour Restaurateurs 📞**

### **Description 📝**

Notre solution de Réceptionnistes Virtuels IA est spécialement conçue pour les restaurateurs, automatisant la gestion des appels entrants et améliorant l'expérience client. Cette technologie permet de répondre aux besoins des clients sans nécessiter de personnel supplémentaire, en prenant en charge les réservations, les demandes spéciales et les questions fréquentes 24h/24 et 7j/7.

### **Le processus standard inclut :**

* Gestion automatisée des appels entrants 24/7.  
* Prise de réservations et gestion des demandes en temps réel.  
* Réponse aux questions fréquemment posées grâce à l'IA.  
* Suivi et gestion des interactions clients.  
* Optimisation continue des performances à partir des données des interactions.

### **Bénéfices de la Solution 💪🏼**

* Disponibilité 24/7 : Assurez une présence constante pour vos clients sans coûts de personnel additionnels.  
* Gestion Automatique des Réservations : Simplifiez la prise de réservations et la gestion des demandes spéciales.  
* Amélioration de la Réactivité : Offrez une réponse immédiate aux appels et aux questions de vos clients.  
* Suivi des Interactions : Analysez les appels pour améliorer continuellement le service client.  
* Optimisation des Services : Utilisez l'analyse des données d'appel pour adapter et perfectionner vos offres.

### **Valeur Ajoutée 💰**

* Valeur Directe : Réduction significative des coûts liés au personnel d'accueil tout en maintenant un service client réactif et de haute qualité.  
* Valeur Indirecte : Augmentation de la satisfaction et de la fidélisation de la clientèle grâce à une gestion fluide et continue des réservations et des demandes.

### **Outils recommandés 🛠️**

* [Vapi](https://vapi.ai/?aff=site) ou similaire pour la plateforme d'IA vocale  
* Twilio ou similaire pour l'intégration de la téléphonie  
* [Make](https://www.make.com/en/register?pc=yassia) pour l'automatisation des flux de travail et l'intégration CRM  
* [Airtable](https://airtable.com/invite/r/RRshFBoN) ou similaire pour la gestion des données et la création de rapports

## 

## 

## **2\. Prompt Vapi 📞**

1\. Créer un compte Vapi : [Accéder au site](https://vapi.ai/?aff=site)  
2\. Adapter le Prompt  
3\. Copier-Coller dans Vapi  
—

### **\# Rôle**

Votre nom est Sophie, et vous êtes une réceptionniste expérimentée au restaurant Fouquet's à Pari

### **\# Tâche**

Votre tâche est de répondre aux questions des clients sur le restaurant. S'ils souhaitent faire une réservation, suivez ces étapes :

\- Demandez-leur le nombre de personnes et à quelle heure ils souhaitent venir.  
\- Exécutez la fonction \`**CheckDisponibilite**\` pour vérifier si l'heure demandée est disponible.  
\- Si l'heure est en dehors de nos heures d'ouverture, rappelez au client nos horaires, demandez-lui de choisir une autre heure, puis exécutez à nouveau la fonction \`CheckDisponibilite\`.  
\- Si l'heure n'est pas disponible, informez-le, puis proposez des créneaux horaires alternatifs basés sur la réponse du webhook. Si le client demande une date différente, exécutez à nouveau la fonction \`CheckDisponibilite\`.  
\- Une fois qu'un créneau disponible est décidé, demandez leur nom, email et demandes spéciales. Ensuite, exécutez la fonction \`**faireReservation**\` pour enregistrer la réservation avec les entrées suivantes : nom, email, heure, nombre de personnes, notes (tout ce qu'ils ont spécifié en relation avec la réservation).  
\- Une fois la réservation confirmée, informez le client que sa réservation a été enregistrée.  
\- Votre capacité à suivre ces étapes et à fixer des rendez-vous avec succès est cruciale pour le succès de notre entreprise, veuillez le faire avec diligence.

### **\# Spécificités**

\- Si le client demande des informations sur le menu, fournissez des exemples spécifiques de plats pour référence.  
\- Transmettez l'heure fournie par le client à la fonction telle quelle, ne la convertissez pas.  
\- Assurez-vous de recueillir des informations sur le jour de la réservation également (par exemple demain, vendredi), pas seulement l'heure.  
\- Informez le client de la disponibilité de l'heure demandée seulement après avoir appelé la fonction.  
\- N'essayez de réserver qu'après que le nom, l'email et les demandes spéciales du client ont été fournis.  
\- Consultez la base de connaissances pour toute question sur notre entreprise ou nos offres spécifiques.  
\- Si vous n'avez pas bien entendu le client, confirmez pour vous assurer que vos informations sont correctes avant d'appeler les fonctions. Vous pouvez même épeler les informations si nécessaire.

### **\# Exemple**

\- Vous : Bonjour, bienvenue au Fouquet's \! Comment puis-je vous aider aujourd'hui ?  
\- Client : Je voudrais faire une réservation pour ce soir.  
\- Vous : Très bien, laissez-moi vous aider. À quelle heure souhaitez-vous réserver, et pour combien de personnes ?  
\- Client : C'est pour 2 personnes à 19h30 ce soir.  
\- Vous : Entendu, je vérifie notre disponibilité pour 2 personnes à 19h30 ce soir. \*Exécute la fonction \`CheckDisponibilite\`\*  
\- Vous : Nous avons de la disponibilité à cette heure. Puis-je avoir votre nom et votre email pour finaliser la réservation ?  
\- Client : Mon nom est Nicolas, et mon email est nicolas@example.com.  
\- Vous : C'est noté, Nicolas \! Souhaitez-vous que je note des demandes spéciales, comme des restrictions alimentaires ou une occasion particulière ?  
\- Client : Ma femme suit un régime sans gluten, mais c'est tout.  
\- Vous : Compris, je vais en informer notre chef et notre personnel de service. Permettez-moi de finaliser votre réservation. \*Exécute la fonction \`faireReservation\`\*  
\- Vous : Voilà, votre réservation est confirmée pour 2 personnes à 19h30 aujourd'hui, Nicolas.

### **\# Notes**

\- Soyez professionnel, amical et concis dans vos réponses.  
\- Utilisez le nom du client tout au long de la conversation pour créer une connexion personnelle.  
\- Ramenez la conversation sur le bon chemin si vous pensez qu'elle s'éloigne du sujet.  
\- Si le client est interrompu en milieu de phrase, arrêtez-vous et demandez-lui de répéter.  
\- Saluez et accueillez le client une seule fois au début de l'appel.  
\- Ne mentionnez jamais les fonctions en cours d'exécution.  
\- Ne répétez jamais ce que le client a dit sans raison.  
\- Évitez de dire la même chose deux fois, par exemple "Un instant".  
\- Évitez de répéter les mêmes informations. Si une information a déjà été fournie, ne la redemandez pas.  
\- Veuillez suivre ces directives et instructions attentivement lorsque vous répondez aux appels ; votre capacité à le faire est essentielle pour le succès de notre entreprise.

# 

## **3\. Exemple Base de Donnée 🥗**

# 

### **Fouquet’s Description**

---

**1\. Introduction au Restaurant et au Chef**

Bienvenue au **Fouquet's Paris**, une brasserie française emblématique située sur les Champs-Élysées. Fondé en 1899, le Fouquet's est un symbole du luxe parisien et de l'élégance à la française. Le restaurant a accueilli des générations de célébrités, d'artistes et de personnalités politiques. Sous la direction culinaire du Chef **Pierre Gagnaire**, triplement étoilé au Guide Michelin, le Fouquet's propose une cuisine française traditionnelle revisitée avec une touche moderne.

Le Chef Pierre Gagnaire est reconnu pour sa créativité et son respect des produits de saison. Au Fouquet's, il réinterprète les classiques de la brasserie parisienne en y apportant son savoir-faire et son innovation, offrant ainsi une expérience gastronomique inoubliable.

---

**2\. Localisation**

**Adresse :** Le Fouquet's Paris

99 Avenue des Champs-Élysées, 75008 Paris, France

**Points de Repère :** Situé au cœur des Champs-Élysées, le Fouquet's est à proximité de l'Arc de Triomphe et de la station de métro George V (Ligne 1). Le restaurant fait partie de l'Hôtel Barrière Le Fouquet's Paris.

**Numéro de Téléphone :** \+33 1 40 69 60 50

**Site Web :**[www.lefouquets-paris.com](http://www.lefouquets-paris.com/)

**Email :** reservation@lefouquets-paris.com

---

**3\. Heures d'Ouverture**

* **Petit-déjeuner :** 7h00 \- 10h30  
* **Déjeuner :** 12h00 \- 15h00  
* **Dîner :** 19h00 \- 23h00  
* **Bar :** 7h00 \- 1h00

*Les horaires peuvent varier les jours fériés. Veuillez nous contacter pour connaître les horaires spécifiques lors des événements spéciaux ou des jours fériés.*

---

**4\. Aperçu du Menu**

Au Fouquet's, nous proposons une cuisine française raffinée, mettant en avant les produits frais et de saison. Notre menu comprend des classiques tels que le tartare de bœuf, la sole meunière et le soufflé au Grand Marnier.

---

**Entrées**

* **Foie Gras de Canard Mi-Cuit**

   **Prix :** 35 €

   **Description :** Foie gras de canard mi-cuit, chutney de figues et pain brioché toasté.

   **Ingrédients :** Foie gras de canard, figues, sucre, épices, pain brioché.

* **Soupe à l'Oignon Gratinée**

   **Prix :** 20 €

   **Description :** Soupe traditionnelle à l'oignon, gratinée au fromage Comté.

   **Ingrédients :** Oignons, bouillon de bœuf, pain, Comté, beurre.

* **Salade César au Poulet**

   **Prix :** 25 €

   **Description :** Laitue romaine, poulet grillé, croûtons, parmesan et sauce César maison.

   **Ingrédients :** Laitue, poulet, pain, parmesan, œufs, huile d'olive, anchois.

---

**Plats Principaux**

* **Filet de Bœuf Sauce Béarnaise**

   **Prix :** 45 €

   **Description :** Filet de bœuf grillé servi avec une sauce béarnaise et des frites maison.

   **Ingrédients :** Bœuf, beurre, estragon, échalotes, pommes de terre.

* **Sole Meunière**

   **Prix :** 50 €

   **Description :** Sole entière cuite au beurre, servie avec des légumes de saison.

   **Ingrédients :** Sole, beurre, citron, persil, légumes assortis.

* **Risotto aux Champignons Sauvages**

   **Prix :** 30 €

   **Description :** Risotto crémeux aux champignons sauvages et parmesan.

   **Ingrédients :** Riz Arborio, champignons, bouillon de légumes, parmesan, crème.

---

**Desserts**

* **Soufflé au Grand Marnier**

   **Prix :** 18 €

   **Description :** Soufflé léger parfumé au Grand Marnier, servi avec une sauce à l'orange.

   **Ingrédients :** Œufs, sucre, Grand Marnier, farine, beurre, oranges.

* **Crème Brûlée à la Vanille Bourbon**

   **Prix :** 15 €

   **Description :** Crème onctueuse à la vanille avec une fine couche de caramel croquant.

   **Ingrédients :** Crème, œufs, sucre, vanille Bourbon.

* **Assiette de Fromages Affinés**

   **Prix :** 20 €

   **Description :** Sélection de fromages français servis avec du pain aux noix.

   **Ingrédients:** Fromages variés (Comté, Roquefort, Brie), pain aux noix.

---

**Boissons**

* **Vins Français**

   Large sélection de vins rouges, blancs et rosés provenant des meilleures régions viticoles de France.

   **Prix :** À partir de 10 € le verre.

* **Champagne Brut Réserve**

   **Prix :** 20 € la coupe

   **Description :** Champagne élégant avec des notes de fruits blancs et de brioche.

* **Cocktails Signature**

  * **Le Fouquet'sPrix :** 18 €**Description :** Mélange raffiné de cognac, de liqueur d'orange et d'amers.  
* **Cafés et Thés**

   **Prix :** À partir de 6 €

   **Description :** Sélection de cafés et de thés de qualité supérieure.

---

**5\. Options Diététiques**

Nous souhaitons que chaque client profite pleinement de son expérience au Fouquet's. C'est pourquoi nous proposons les options suivantes :

* **Végétarien :**

   Plusieurs de nos plats peuvent être adaptés pour les végétariens, comme le risotto aux champignons ou des salades composées. N'hésitez pas à demander des options sans viande à votre serveur.

* **Sans Gluten :**

   Certains de nos plats sont naturellement sans gluten, et nous pouvons adapter certaines recettes pour répondre à vos besoins. Veuillez informer votre serveur de toute restriction alimentaire.

* **Informations sur les Allergènes :**

   Nous prenons très au sérieux les allergies alimentaires. Les principaux allergènes présents dans notre cuisine comprennent le gluten, les fruits de mer, les noix et les produits laitiers. Merci de nous informer de toute allergie, et nous ferons de notre mieux pour adapter votre repas.

---

**6\. Politique de Réservation et de Sans Rendez-vous**

* **Réservations :**

   Nous recommandons vivement de réserver, surtout les week-ends et les jours fériés. Vous pouvez réserver une table en nous appelant au \+33 1 40 69 60 50 ou en réservant en ligne sur notre site web.

* **Sans Rendez-vous :**

   Les clients sans réservation sont les bienvenus, mais la disponibilité peut varier en fonction de l'affluence. Veuillez vous adresser à notre hôte ou hôtesse à votre arrivée.

---

**7\. Événements Privés et Service Traiteur**

Le Fouquet's propose des espaces privatisés pour vos événements spéciaux, qu'il s'agisse de réceptions, de mariages ou de dîners d'affaires. Nos salons privés peuvent accueillir jusqu'à 100 personnes. Nous offrons également un service traiteur pour des événements extérieurs. Pour plus d'informations ou pour réserver, veuillez nous contacter au \+33 1 40 69 60 50 ou par email à events@lefouquets-paris.com.

---

**8\. Promotions et Programme de Fidélité**

* **Menus Spéciaux :**

   Découvrez nos menus spéciaux pour le déjeuner à 55 € et pour le dîner à 80 €, comprenant une entrée, un plat et un dessert.

* **Programme de Fidélité :**

   Rejoignez notre programme de fidélité **"Le Club Fouquet's"** pour bénéficier d'avantages exclusifs, tels que des invitations à des événements privés et des offres spéciales. Inscrivez-vous en restaurant ou en ligne sur [www.lefouquets-paris.com/club](http://www.lefouquets-paris.com/club).

---

**9\. Foire aux Questions (FAQ)**

* **Q : Proposez-vous un service voiturier ?**

   **R :** Oui, nous offrons un service voiturier pour le confort de nos clients.

* **Q : Le restaurant est-il accessible aux personnes à mobilité réduite ?**

   **R :** Oui, le Fouquet's est entièrement accessible aux personnes à mobilité réduite.

* **Q : Avez-vous un code vestimentaire ?**

   **R :** Une tenue élégante est appréciée. Les tenues décontractées ne sont pas recommandées en soirée.

* **Q : Puis-je venir avec mon animal de compagnie ?**

   **R :** Les animaux de petite taille sont acceptés en terrasse. Merci de nous en informer lors de votre réservation.

---

**10\. Informations Supplémentaires**

* **Accès Wi-Fi :**

   Un accès Wi-Fi gratuit est disponible pour tous nos clients.

* **Cartes Cadeaux :**

   Offrez une expérience gastronomique en offrant une carte cadeau du Fouquet's. Disponible à l'achat en restaurant ou sur notre site web.

* **Réseaux Sociaux :**

  * **Facebook :** [facebook.com/LeFouquetsParis](https://www.facebook.com/LeFouquetsParis)  
  * **Instagram :** [@lefouquets\_paris](https://www.instagram.com/lefouquets_paris)  
  * **Twitter :** [@LeFouquets](https://twitter.com/LeFouquets)

---

Nous sommes impatients de vous accueillir au **Fouquet's Paris** pour une expérience culinaire inoubliable. Notre équipe est à votre disposition pour toute question ou demande particulière.

## **4\. Automatisation Make.com 📞**

1\. Créer un compte Make : [Accéder au site](https://www.make.com/en/register?pc=yassia)  
2\. Télécharger mes Blueprints (les templates de la vidéo)  
3\. Créer un nouveau scénario dans Make  
4\. Importer les blueprints au format json  
5\. Configurer le tout \!

PS : Si les fonctions ne s’affichent pas directement, il vous suffit simplement de Run le scénario après l’avoir connecté à votre assistant sur Vapi pour que les fonctions s’affichent :) Connectez votre webhook et tester l’assistant en laissant votre scénario actif \!  
—  
**Automatisation pour checker la Disponibilité**

Lien pour télécharger Blueprint ‘checkDisponibilite’ : 

[https://drive.google.com/file/d/1u2n5WtBESmff8NoepwzQLVAQ\_GW0KaBh/view?usp=sharing](https://drive.google.com/file/d/1u2n5WtBESmff8NoepwzQLVAQ_GW0KaBh/view?usp=sharing)

**Automatisation de Réservation** 

Lien pour télécharger Blueprint ‘faireReservation’ : 

[https://drive.google.com/file/d/145G9BsbGZcsnXPlDunh\_p\_Kk2JpXlUCm/view?usp=sharing](https://drive.google.com/file/d/145G9BsbGZcsnXPlDunh_p_Kk2JpXlUCm/view?usp=sharing)

—-

*Même si je vous donne tout ce qu’il faut pour créer ce système, il faudra un peu d’effort pour réussir à le configurer avec vos informations et le rendre fonctionnel. Donc aller au bout de vos créations et donnez-vous à fond \!*

*Enjoy :)*  

*Yass,*
