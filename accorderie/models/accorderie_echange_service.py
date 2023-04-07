import logging

from odoo import _, api, fields, models

_logger = logging.getLogger(__name__)


class AccorderieEchangeService(models.Model):
    _name = "accorderie.echange.service"
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

    membre_qui_a_valide = fields.Many2one(
        comodel_name="accorderie.membre",
        string="Membre qui a validé",
    )

    date_valide = fields.Datetime(string="Date de la validation")

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

    distance_trajet = fields.Float(
        string="Distance du trajet",
        help="Unité par défaut le km.",
    )

    frais_trajet = fields.Float(
        string="Frais du trajet",
        help="Coût pour faire le trajet.",
    )

    frais_materiel = fields.Float(
        string="Frais du matériel",
        help="Coût matériel nécessaire à l'échange de service.",
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
            if "offre_service" in vals.keys():
                offre_service_id = self.env["accorderie.offre.service"].browse(
                    vals.get("offre_service")
                )
                if "membre_vendeur" not in vals.keys():
                    if offre_service_id.membre:
                        vals["membre_vendeur"] = offre_service_id.membre.id
                else:
                    membre_vendeur_id = vals.get("membre_vendeur")
                    if offre_service_id.membre.id != membre_vendeur_id:
                        _logger.error(
                            "Detect wrong value, membre_vendeur id"
                            f" '{membre_vendeur_id}' is different of"
                            " offre_service_id.membre.id"
                            f" '{offre_service_id.membre.id}'"
                        )
                        vals["membre_vendeur"] = offre_service_id.membre.id
            if "demande_service" in vals.keys():
                demande_service_id = self.env[
                    "accorderie.demande.service"
                ].browse(vals.get("demande_service"))
                if "membre_acheteur" not in vals.keys():
                    if demande_service_id.membre:
                        vals["membre_acheteur"] = demande_service_id.membre.id
                else:
                    membre_acheteur_id = vals.get("membre_acheteur")
                    if demande_service_id.membre.id != membre_acheteur_id:
                        _logger.error(
                            "Detect wrong value, membre_acheteur id"
                            f" '{membre_acheteur_id}' is different of"
                            " demande_service_id.membre.id"
                            f" '{demande_service_id.membre.id}'"
                        )
                        vals["membre_acheteur"] = demande_service_id.membre.id
        res = super(AccorderieEchangeService, self).create(vals_list)
        lst_notif_value = []
        for es in res:
            owner_membre_id = es.write_uid.accorderie_membre_ids.exists()
            # Remove owner (membre who ask) to notif list
            if owner_membre_id:
                lst_membre_notif = list(
                    {res.membre_acheteur, res.membre_vendeur}.difference(
                        set(owner_membre_id)
                    )
                )
            else:
                lst_membre_notif = [res.membre_acheteur, res.membre_vendeur]
            for membre_id in lst_membre_notif:
                # Create notification
                value = {}
                if not es.demande_service and not es.offre_service:
                    _logger.warning(
                        "How doing notification without offre/demande service"
                        " on échange?"
                    )
                    continue
                value["echange_service_id"] = es.id
                value["membre_id"] = membre_id.id
                if es.demande_service and es.offre_service:
                    value["type_notification"] = "Proposition de service"
                elif es.demande_service:
                    value["type_notification"] = "Demande de service"
                elif es.offre_service:
                    value["type_notification"] = "Proposition de service"
                if value:
                    lst_notif_value.append(value)
        if lst_notif_value:
            self.env["accorderie.echange.service.notification"].create(
                lst_notif_value
            )
        return res

    @api.multi
    def write(self, vals):
        res = super().write(vals)
        for rec in self:
            membre_qui_a_valide = vals.get("membre_qui_a_valide")
            if vals.get("transaction_valide") and membre_qui_a_valide:
                lst_membre_notif = list(
                    {rec.membre_acheteur.id, rec.membre_vendeur.id}.difference(
                        {membre_qui_a_valide}
                    )
                )
                for membre_id in lst_membre_notif:
                    value = {
                        "membre_id": membre_id,
                        "echange_service_id": rec.id,
                        "type_notification": "Transaction validée",
                    }
                    self.env["accorderie.echange.service.notification"].create(
                        value
                    )
        return res

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
