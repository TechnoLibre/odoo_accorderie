# ERPLibre Accorderie

Module ERPLibre pour les Accorderies du Québec.

Pour simplification, mettez la sauvegarde du logiciel portail membre et du site web au path `/accorderie_canada/`, ainsi
le reste des commandes pourront être automatisé.

Installer `mariadb` et exécuter `./addons/TechnoLibre_odoo_accorderie/script/restore_database_accorderie.sh` à partir de
ERPLibre.

Le reste du document sont des informations détaillées au script de restoration.

## Base de données

Il est considéré pour la migration de l'Accorderie vers la plateforme ERPLibre, qu'il y a une base de donnée accessible
localement avec les informations suivantes :

```python
host = "localhost"
user = "accorderie"
passwd = "accorderie"
db_name = "accorderie_log_2019"
port = 3306
```

### Migration et correction d'erreur

Dans le fichier SQL, il y a des dates qui ont la valeur '0000-00-00' au lieu de NULL, ça fait planter PostgreSQL.

Corriger le fichier SQL avec la commande suivante avant de restorer la base de donnée.

```bash
sed -i "s/'0000-00-00'/NULL/g" accorderie_log_2019
```

### Restoration d'une base de données

Créer une base de donnée

```bash
# Log into mysql
mysql -u root
```

```sql
-- Create new database user
CREATE
USER 'accorderie'@'localhost' IDENTIFIED BY 'accorderie';
GRANT ALL PRIVILEGES ON *.* TO
'accorderie'@'localhost' IDENTIFIED BY 'accorderie';
FLUSH
PRIVILEGES;
CREATE
DATABASE accorderie_log_2019;
-- Log out
```

Restorer le fichier SQL de la dernière sauvegarde. Assurez-vous que dans le fichier sql, il n'ait pas de commande `USE`
d'une base de donnée particulière.

```bash
# Log into mysql
mysql -u accorderie -p accorderie_log_2019 < /accorderie_canada/Intranet/accorder_AccorderieIntranet_20200826.sql
```

### Effacer une base de données

Pour afficher toutes les bases de données

```sql
show
databases;
```

Effacer votre table, avec exemple de table 'accorderie_log_2019'

```sql
DROP
DATABASE accorderie_log_2019;
```

### Création de modules ERPLibre à partir du générateur de code

À la racine du projet, installer le module de génération de module à partir de base de données :

```bash
./script/db_restore.py --database accorderie
./script/addons/install_addons_dev.sh accorderie code_generator_db_servers
```

## Création du template à partir du générateur de code généré par le migrateur

Modifier le fichier dans `addons/TechnoLibre_odoo-code-generator-template/code_generator_demo/hooks.py`, en vous basant
sur le guide de `doc/CODE_GENERATOR.fr.md`, mettre à jour la variable `path_module_generator` en ajoutant
dans `os.path.normpath` la valeur `'..', 'TechnoLibre_odoo_accorderie'`, activer la variable `path_sync_code`
dans `value`, puis renommer le contenu de `MODULE_NAME` pour `code_generator_template_accorderie_canada_ddb`.

Ensuite, générer le tout avec

```bash
make addons_install_code_generator_demo
```

Adapter le fichier généré, puis activer `enable_sync_template`.

TODO il faut mettre une variable pour mettre à jour `template_model_name`, garder le `path_module_generate` actif lors
le path est différent dans la génération. Garder le `import os`.