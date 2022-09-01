from datetime import datetime

from odoo import _, api, fields, models


class AccorderieMembre(models.Model):
    _name = "accorderie.membre"
    _inherit = "portal.mixin"
    _description = "Accorderie Membre"
    _rec_name = "nom_complet"

    nom_complet = fields.Char(
        string="Nom complet",
        compute="_compute_nom_complet",
        store=True,
    )

    membre_partner_id = fields.Many2one(
        comodel_name="res.partner",
        string="Membre",
        track_visibility="onchange",
    )

    accorderie = fields.Many2one(
        comodel_name="accorderie.accorderie",
        required=True,
        help="Accorderie associée",
    )

    achat_regrouper = fields.Boolean(string="Achat regroupé")

    active = fields.Boolean(
        string="Actif",
        default=True,
        help=(
            "Lorsque non actif, ce membre n'est plus en fonction, mais demeure"
            " accessible."
        ),
    )

    adresse = fields.Char()

    annee_naissance = fields.Integer(string="Année de naissance")

    arrondissement = fields.Many2one(comodel_name="accorderie.arrondissement")

    bottin_courriel = fields.Boolean(string="Bottin courriel")

    bottin_tel = fields.Boolean(string="Bottin téléphone")

    codepostal = fields.Char()

    commentaire = fields.One2many(
        comodel_name="accorderie.commentaire",
        inverse_name="membre_source",
        string="Commentaire membre source",
        help="Commentaire membre source relation",
    )

    commentaire_ids = fields.One2many(
        comodel_name="accorderie.commentaire",
        inverse_name="membre_viser",
        string="Commentaire membre visé",
        help="Commentaire membre visé relation",
    )

    courriel = fields.Char()

    date_adhesion = fields.Date(string="Date de l'adhésion")

    date_mise_a_jour = fields.Datetime(
        string="Dernière mise à jour",
        help="Date de la dernière mise à jour",
    )

    description_membre = fields.Boolean(string="Description du membre")

    est_un_point_service = fields.Boolean(string="Est un point de service")

    membre_ca = fields.Boolean(string="Membre du CA")

    membre_conjoint = fields.Boolean(string="A un membre conjoint")

    membre_conjoint_id = fields.Integer(string="Membre conjoint")

    membre_principal = fields.Boolean(string="Membre principal")

    memo = fields.Text(string="Mémo")

    nom = fields.Char()

    nom_utilisateur = fields.Char(string="Nom du compte")

    occupation = fields.Many2one(comodel_name="accorderie.occupation")

    origine = fields.Many2one(comodel_name="accorderie.origine")

    offre_service_ids = fields.One2many(
        comodel_name="accorderie.offre.service",
        inverse_name="membre",
        string="Offre de service",
        help="Les offres de service du membre",
    )

    demande_service_ids = fields.One2many(
        comodel_name="accorderie.demande.service",
        inverse_name="membre",
        string="Demande de service",
        help="Les demandes de service du membre",
    )

    echange_service_acheteur_ids = fields.One2many(
        comodel_name="accorderie.echange.service",
        inverse_name="membre_acheteur",
        string="Échange de service acheteur",
        help="Les échanges de service du membre acheteur",
    )

    echange_service_vendeur_ids = fields.One2many(
        comodel_name="accorderie.echange.service",
        inverse_name="membre_vendeur",
        string="Échange de service vendeur",
        help="Les échanges de service du membre vendeur",
    )

    membre_favoris_ids = fields.Many2many(
        string="Membre favoris",
        comodel_name="accorderie.membre.favoris",
        help="Liste des membres favoris",
    )

    part_social_paye = fields.Boolean(string="Part social payé")

    pas_communication = fields.Boolean(string="Pas de communication")

    point_service = fields.Many2one(
        comodel_name="accorderie.point.service",
        string="Point de service",
        help="Point de service associé",
    )

    prenom = fields.Char(string="Prénom")

    pret_actif = fields.Boolean(string="Prêt actif")

    profil_approuver = fields.Boolean(string="Profil approuvé")

    provenance = fields.Many2one(comodel_name="accorderie.provenance")

    quartier = fields.Many2one(comodel_name="accorderie.quartier")

    recevoir_courriel_groupe = fields.Boolean(
        string="Veut recevoir courriel de groupes"
    )

    region = fields.Many2one(
        comodel_name="accorderie.region",
        string="Région",
        required=True,
    )

    revenu_familial = fields.Many2one(
        comodel_name="accorderie.revenu.familial",
        string="Revenu familial",
    )

    sexe = fields.Selection(
        selection=[("femme", "Femme"), ("homme", "Homme"), ("autre", "Autre")]
    )

    situation_maison = fields.Many2one(
        comodel_name="accorderie.situation.maison",
        string="Situation maison",
    )

    telephone_1 = fields.Char(string="1er téléphone")

    telephone_2 = fields.Char(string="2e téléphone")

    telephone_3 = fields.Char(string="3e téléphone")

    telephone_poste_1 = fields.Char(string="1er poste téléphone")

    telephone_poste_2 = fields.Char(string="2 poste téléphone")

    telephone_poste_3 = fields.Char(string="3 poste téléphone")

    telephone_type_1 = fields.Many2one(
        comodel_name="accorderie.type.telephone",
        string="1er type de téléphones",
    )

    telephone_type_2 = fields.Many2one(
        comodel_name="accorderie.type.telephone",
        string="2e type de téléphones",
    )

    telephone_type_3 = fields.Many2one(
        comodel_name="accorderie.type.telephone",
        string="3e type de téléphones",
    )

    transfert_accorderie = fields.Many2one(
        comodel_name="accorderie.accorderie",
        string="Transfert d'une Accorderie",
    )

    type_communication = fields.Many2one(
        comodel_name="accorderie.type.communication",
        string="Type de communications",
    )

    user_id = fields.Many2one(
        comodel_name="res.users",
        string="User",
    )

    ville = fields.Many2one(
        comodel_name="accorderie.ville",
        required=True,
    )

    antecedent_judiciaire_verifier = fields.Boolean(
        string="Antécédents judiciaires vérifiés",
        help="Vérifier par l'organisation",
    )

    introduction = fields.Char(help="Un petit texte qui décrit le membre.")

    bank_time = fields.Float(
        string="Temps en banque",
        compute="_bank_time",
        store=True,
    )

    bank_month_time = fields.Float(
        string="Temps en banque du présent mois",
        compute="_bank_time",
        store=True,
    )

    @api.multi
    def write(self, vals):
        for rec in self:
            # 'accorderie.notification.favorite',
            self.env["bus.bus"].sendone(
                f'["{self._cr.dbname}","{self._name}",{rec.id}]',
                {"timestamp": str(datetime.now()), "data": vals},
            )
        return super().write(vals)

    @api.depends(
        "membre_partner_id",
        "echange_service_acheteur_ids",
        "echange_service_vendeur_ids",
    )
    def _bank_time(self):
        # TODO wrong dependency
        # TODO calculate transaction difference
        for rec in self:
            # TODO bank 15 hours suppose to be calculate somewhere else
            this_month = datetime.now().month
            bank_time = (
                15
                + sum(
                    [
                        a.nb_heure
                        for a in rec.echange_service_acheteur_ids
                        if a.transaction_valide
                    ]
                )
                - sum(
                    [
                        a.nb_heure
                        for a in rec.echange_service_vendeur_ids
                        if a.transaction_valide
                    ]
                )
            )
            bank_time_month = sum(
                [
                    a.nb_heure
                    for a in rec.echange_service_acheteur_ids
                    if a.transaction_valide
                    and a.date_echange
                    and a.date_echange.month == this_month
                ]
            ) - sum(
                [
                    a.nb_heure
                    for a in rec.echange_service_vendeur_ids
                    if a.transaction_valide
                    and a.date_echange
                    and a.date_echange.month == this_month
                ]
            )

            rec.bank_time = bank_time
            rec.bank_month_time = bank_time_month

    def _compute_access_url(self):
        super(AccorderieMembre, self)._compute_access_url()
        for accorderie_membre in self:
            accorderie_membre.access_url = (
                "/my/accorderie_membre/%s" % accorderie_membre.id
            )

    @api.depends("nom", "prenom", "est_un_point_service", "point_service")
    def _compute_nom_complet(self):
        for rec in self:
            rec.nom_complet = False
            if rec.est_un_point_service:
                rec.nom_complet = f"Point de service {rec.point_service.nom}"
            else:
                if rec.nom and rec.prenom:
                    rec.nom_complet = f"{rec.prenom} {rec.nom}"
                elif rec.nom:
                    rec.nom_complet = f"{rec.nom}"
                elif rec.prenom:
                    rec.nom_complet = f"{rec.prenom}"
