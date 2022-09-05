from odoo import _, api, fields, models


class AccorderieEchangeService(models.Model):
    _name = "accorderie.echange.service"
    _inherit = "portal.mixin"
    _description = "Accorderie Echange Service"
    _rec_name = "nom_complet"

    nom_complet = fields.Char(
        string="Nom complet",
        compute="_compute_nom_complet",
        store=True,
    )

    commentaire = fields.Char()

    date_echange = fields.Datetime(string="Date de l'échange")

    # date_transaction = fields.Datetime(string="Date de la transaction")

    demande_service = fields.Many2one(
        comodel_name="accorderie.demande.service",
        string="Demande de services",
    )

    # TODO compute membre_acheter from service
    membre_acheteur = fields.Many2one(
        comodel_name="accorderie.membre",
        string="Membre acheteur",
    )

    membre_vendeur = fields.Many2one(
        comodel_name="accorderie.membre",
        string="Membre vendeur",
    )

    nb_heure = fields.Float(
        string="Nombre d'heure",
        help="Nombre d'heure effectué au moment de l'échange.",
    )

    nb_heure_estime = fields.Float(
        string="Nombre d'heure estimé",
        help="Nombre d'heure estimé pour l'échange.",
    )

    nb_heure_duree_trajet = fields.Float(
        string="Nombre d'heure durée trajet",
        help="Nombre d'heure effectué au moment de le trajet.",
    )

    nb_heure_estime_duree_trajet = fields.Float(
        string="Nombre d'heure estimé durée trajet",
        help="Nombre d'heure estimé pour le trajet.",
    )

    offre_service = fields.Many2one(
        comodel_name="accorderie.offre.service",
        string="Offre de services",
    )

    point_service = fields.Many2one(
        comodel_name="accorderie.point.service",
        string="Point de services",
    )

    remarque = fields.Char()

    transaction_valide = fields.Boolean(
        string="Validé",
        help="Activé lorsque la transaction a été validé",
    )

    titre = fields.Char(
        string="Titre",
        compute="_compute_titre",
        help=(
            "Titre de l'offre de service ou de la demande de service, ou les"
            " deux"
        ),
        store=True,
    )

    type_echange = fields.Selection(
        selection=[
            ("offre_ordinaire", "Offre ordinaire"),
            ("offre_special", "Offre spéciale"),
            ("demande", "Demande"),
            ("offre_ponctuel", "Offre ponctuelle"),
        ],
        string="Type d'échange",
    )

    @api.model_create_multi
    def create(self, vals_list):
        # Create member if not exist
        for vals in vals_list:
            if (
                "offre_service" in vals.keys()
                and "membre_vendeur" not in vals.keys()
            ):
                offre_service_id = self.env["accorderie.offre.service"].browse(
                    vals.get("offre_service")
                )
                if offre_service_id.membre:
                    vals["membre_vendeur"] = offre_service_id.membre.id
            if (
                "demande_service" in vals.keys()
                and "membre_acheteur" not in vals.keys()
            ):
                demande_service_id = self.env[
                    "accorderie.demande.service"
                ].browse(vals.get("demande_service"))
                if demande_service_id.membre:
                    vals["membre_acheteur"] = demande_service_id.membre.id
        res = super(AccorderieEchangeService, self).create(vals_list)
        return res

    def _compute_access_url(self):
        super(AccorderieEchangeService, self)._compute_access_url()
        for accorderie_echange_service in self:
            accorderie_echange_service.access_url = (
                "/my/accorderie_echange_service/%s"
                % accorderie_echange_service.id
            )

    @api.depends("type_echange", "point_service")
    def _compute_nom_complet(self):
        for rec in self:
            value = ""
            if rec.type_echange:
                value += rec.type_echange
            if rec.point_service and rec.point_service.nom:
                if rec.type_echange:
                    value += " - "
                value += rec.point_service.nom
            if not value:
                value = False
            rec.nom_complet = value

    @api.depends("offre_service", "demande_service")
    def _compute_titre(self):
        for rec in self:
            value = ""
            if rec.offre_service and rec.offre_service.titre:
                value += rec.offre_service.titre
            if rec.demande_service and rec.demande_service.titre:
                value += rec.demande_service.titre
            if not value:
                value = "VIDE"
            rec.titre = value
