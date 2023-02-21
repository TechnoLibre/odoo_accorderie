from datetime import date, datetime

from odoo import _, api, fields, models


class AccorderieMembre(models.Model):
    _name = "accorderie.membre"
    _inherit = ["mail.activity.mixin", "mail.thread"]
    _description = "Accorderie Membre"
    _rec_name = "nom"

    nom = fields.Char(
        track_visibility="onchange",
    )

    partner_id = fields.Many2one(
        comodel_name="res.partner",
        string="Membre",
        track_visibility="onchange",
    )

    accorderie = fields.Many2one(
        comodel_name="accorderie.accorderie",
        required=True,
        track_visibility="onchange",
        help="Accorderie associée",
    )

    achat_regrouper = fields.Boolean(
        string="Achat regroupé",
        track_visibility="onchange",
    )

    active = fields.Boolean(
        string="Actif",
        default=True,
        track_visibility="onchange",
        help=(
            "Lorsque non actif, ce membre n'est plus en fonction, mais demeure"
            " accessible."
        ),
    )

    adresse = fields.Char(
        track_visibility="onchange",
    )

    annee_naissance = fields.Integer(
        string="Année de naissance",
        track_visibility="onchange",
    )

    age = fields.Integer(
        string="Âge",
        compute="_compute_age",
        track_visibility="onchange",
    )

    arrondissement = fields.Many2one(
        comodel_name="accorderie.arrondissement",
        track_visibility="onchange",
    )

    bottin_courriel = fields.Boolean(
        string="Bottin courriel",
        track_visibility="onchange",
    )

    bottin_tel = fields.Boolean(
        string="Bottin téléphone",
        track_visibility="onchange",
    )

    codepostal = fields.Char(
        track_visibility="onchange",
    )

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

    courriel = fields.Char(
        track_visibility="onchange",
    )

    date_adhesion = fields.Date(
        string="Date de l'adhésion",
        track_visibility="onchange",
    )

    description_membre = fields.Boolean(
        string="Description du membre",
        track_visibility="onchange",
    )

    # TODO remove
    est_un_point_service = fields.Boolean(string="Est un point de service")

    logo = fields.Binary(
        help="Logo du membre",
        track_visibility="onchange",
    )

    membre_ca = fields.Boolean(
        string="Membre du CA",
        track_visibility="onchange",
    )

    membre_conjoint = fields.Boolean(
        string="A un membre conjoint",
        track_visibility="onchange",
    )

    # TODO this is wrong, suppose to be many2many
    membre_conjoint_id = fields.Integer(string="Membre conjoint")

    membre_principal = fields.Boolean(
        string="Membre principal",
        track_visibility="onchange",
    )

    is_time_updated = fields.Boolean(
        string="Time is updated",
        help="This variable is a trigger to update time.",
    )

    # TODO remove
    memo = fields.Text(string="Mémo")

    # TODO remove
    nom_utilisateur = fields.Char(
        string="Nom du compte",
        track_visibility="onchange",
    )

    occupation = fields.Many2one(
        comodel_name="accorderie.occupation",
        track_visibility="onchange",
    )

    origine = fields.Many2one(
        comodel_name="accorderie.origine",
        track_visibility="onchange",
    )

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

    part_social_paye = fields.Boolean(
        string="Part social payé",
        track_visibility="onchange",
    )

    pas_communication = fields.Boolean(
        string="Pas de communication",
        track_visibility="onchange",
    )

    point_service = fields.Many2one(
        comodel_name="accorderie.point.service",
        string="Point de service",
        track_visibility="onchange",
        help="Point de service associé",
    )

    pret_actif = fields.Boolean(
        string="Prêt actif",
        track_visibility="onchange",
    )

    profil_approuver = fields.Boolean(
        string="Profil approuvé",
        track_visibility="onchange",
    )

    provenance = fields.Many2one(
        comodel_name="accorderie.provenance",
        track_visibility="onchange",
    )

    quartier = fields.Many2one(
        comodel_name="accorderie.quartier",
        track_visibility="onchange",
    )

    recevoir_courriel_groupe = fields.Boolean(
        string="Veut recevoir courriel de groupes",
        track_visibility="onchange",
    )

    region = fields.Many2one(
        comodel_name="accorderie.region",
        string="Région",
        track_visibility="onchange",
        required=True,
    )

    revenu_familial = fields.Many2one(
        comodel_name="accorderie.revenu.familial",
        track_visibility="onchange",
        string="Revenu familial",
    )

    sexe = fields.Selection(
        selection=[("femme", "Femme"), ("homme", "Homme"), ("autre", "Autre")],
        track_visibility="onchange",
    )

    situation_maison = fields.Many2one(
        comodel_name="accorderie.situation.maison",
        string="Situation maison",
        track_visibility="onchange",
    )

    telephone_1 = fields.Char(
        string="1er téléphone",
        track_visibility="onchange",
    )

    telephone_2 = fields.Char(
        string="2e téléphone",
        track_visibility="onchange",
    )

    telephone_3 = fields.Char(
        string="3e téléphone",
        track_visibility="onchange",
    )

    telephone_poste_1 = fields.Char(
        string="1er poste téléphone",
        track_visibility="onchange",
    )

    telephone_poste_2 = fields.Char(
        string="2 poste téléphone",
        track_visibility="onchange",
    )

    telephone_poste_3 = fields.Char(
        string="3 poste téléphone",
        track_visibility="onchange",
    )

    telephone_type_1 = fields.Many2one(
        comodel_name="accorderie.type.telephone",
        string="1er type de téléphones",
        track_visibility="onchange",
    )

    telephone_type_2 = fields.Many2one(
        comodel_name="accorderie.type.telephone",
        string="2e type de téléphones",
        track_visibility="onchange",
    )

    telephone_type_3 = fields.Many2one(
        comodel_name="accorderie.type.telephone",
        string="3e type de téléphones",
        track_visibility="onchange",
    )

    transfert_accorderie = fields.Many2one(
        comodel_name="accorderie.accorderie",
        string="Transfert d'une Accorderie",
        track_visibility="onchange",
    )

    type_communication = fields.Many2one(
        comodel_name="accorderie.type.communication",
        string="Type de communications",
        track_visibility="onchange",
    )

    user_id = fields.Many2one(
        comodel_name="res.users",
        string="User",
        track_visibility="onchange",
    )

    ville = fields.Many2one(
        comodel_name="accorderie.ville",
        required=True,
        track_visibility="onchange",
    )

    antecedent_judiciaire_verifier = fields.Boolean(
        string="Antécédents judiciaires vérifiés",
        help="Vérifier par l'organisation",
        track_visibility="onchange",
    )

    introduction = fields.Char(
        help="Un petit texte qui décrit le membre.",
        track_visibility="onchange",
    )

    bank_time = fields.Float(
        string="Temps en banque",
        compute="_bank_time",
        track_visibility="onchange",
        store=True,
    )

    bank_month_time = fields.Float(
        string="Temps en banque du présent mois",
        compute="_bank_time",
        track_visibility="onchange",
        store=True,
    )

    bank_max_service_offert = fields.Float(
        string="Temps maximal de service offert",
        compute="_bank_time",
        track_visibility="onchange",
        store=True,
    )

    @api.multi
    def write(self, vals):
        status = super().write(vals)

        # Detect user
        for rec in self:
            if "logo" in vals.keys():
                logo = vals.get("logo")
                xml_id = f"ir_attachment_accorderie_membre_logo_{rec.id}"
                # Find attachment
                ir_attach_id = self.env["ir.attachment"].search(
                    [("name", "=", xml_id)]
                )
                if not ir_attach_id:
                    self.env["ir.attachment"].create(
                        {
                            "name": xml_id,
                            "datas": logo,
                            "res_model": "accorderie.membre",
                            "res_id": rec.id,
                            "type": "url",
                        }
                    )
                else:
                    ir_attach_id.datas = logo

            # Update ir.attachement if change into logo
            self.env["bus.bus"].sendone(
                # f'["{self._cr.dbname}","{self._name}",{rec.id}]',
                "accorderie.notification.favorite",
                {
                    "timestamp": str(datetime.now()),
                    "data": vals,
                    "field_id": rec.id,
                    "canal": f'["{self._cr.dbname}","{self._name}",{rec.id}]',
                },
            )
        return status

    @api.depends(
        "partner_id",
        "echange_service_acheteur_ids",
        "echange_service_vendeur_ids",
        "is_time_updated",
    )
    def _bank_time(self):
        # TODO wrong dependency
        # TODO use recompute instead of is_time_updated to force recompute
        # TODO calculate transaction difference
        for rec in self:
            this_month = datetime.now().month
            this_year = datetime.now().year
            bank_time = sum(
                [
                    a.nb_heure + a.nb_heure_duree_trajet
                    for a in rec.echange_service_vendeur_ids
                    if a.transaction_valide
                ]
            ) - sum(
                [
                    a.nb_heure + a.nb_heure_duree_trajet
                    for a in rec.echange_service_acheteur_ids
                    if a.transaction_valide
                ]
            )
            bank_max_service_offert = sum(
                [
                    a.nb_heure + a.nb_heure_duree_trajet
                    for a in rec.echange_service_vendeur_ids
                    if a.transaction_valide
                ]
            )
            bank_time_month = sum(
                [
                    a.nb_heure + a.nb_heure_duree_trajet
                    for a in rec.echange_service_vendeur_ids
                    if a.transaction_valide
                    and a.date_echange
                    and a.date_echange.month == this_month
                    and a.date_echange.year == this_year
                ]
            ) - sum(
                [
                    a.nb_heure + a.nb_heure_duree_trajet
                    for a in rec.echange_service_acheteur_ids
                    if a.transaction_valide
                    and a.date_echange
                    and a.date_echange.month == this_month
                    and a.date_echange.year == this_year
                ]
            )

            rec.bank_time = bank_time
            rec.bank_month_time = bank_time_month
            rec.bank_max_service_offert = bank_max_service_offert

    @api.depends("annee_naissance")
    def _compute_age(self):
        for rec in self:
            if not rec.annee_naissance:
                rec.age = 0
            else:
                today = date.today()
                # TODO algorithme avec date de naisance et non année de naissance
                # rec.age = today.year - birthdate.year - ((today.month, today.day) < (birthdate.month, birthdate.day))
                rec.age = today.year - rec.annee_naissance
