import logging
from datetime import datetime

from odoo import _, api, fields, models

_logger = logging.getLogger(__name__)


class AccorderieEchangeServiceNotification(models.Model):
    _name = "accorderie.echange.service.notification"
    _description = "Accorderie Echange Service Notification"
    _order = "create_date desc"

    name = fields.Char(compute="_compute_name", store=True)

    active = fields.Boolean(default=True)

    is_read = fields.Boolean(
        string="Is read", help="La notification a été lu par le membre."
    )

    type_notification = fields.Selection(
        [
            ("Nouvelle demande de service", "Nouvelle demande de service"),
            ("Réponse à votre demande", "Réponse à votre demande"),
            ("Demande de service", "Demande de service"),
            ("Proposition de service", "Proposition de service"),
            # ("Réponse à votre offre", "Réponse à votre offre"),
            ("Transaction validée", "Transaction validée"),
        ]
    )

    echange_service_id = fields.Many2one(
        comodel_name="accorderie.echange.service",
        string="Échange de service",
    )

    membre_id = fields.Many2one(
        comodel_name="accorderie.membre",
        string="Membre notifié",
    )

    membre_name = fields.Char(compute="_compute_membre_name", store=True)

    membre_logo = fields.Char(compute="_compute_name", store=True)

    def first_to_json(self):
        obj = self[0]
        data = {
            "id": obj.id,
            "name": obj.name,
            "is_read": obj.is_read,
            "type_notification": obj.type_notification,
            "echange_service_id": obj.echange_service_id.id,
            "membre_id": obj.membre_id.id,
            "membre_name": obj.membre_name,
            "membre_photo": obj.membre_logo,
        }
        return data

    @api.depends("echange_service_id", "membre_id")
    def _compute_name(self):
        for rec in self:
            lst_msg = []
            if (
                rec.echange_service_id.membre_acheteur
                and rec.echange_service_id.membre_acheteur.id
                != rec.membre_id.id
            ):
                lst_msg.append(
                    f"Membre : '{rec.echange_service_id.membre_acheteur.nom}'"
                )
                rec.membre_logo = (
                    rec.echange_service_id.membre_acheteur.logo_attachment_id.local_url
                )
            if (
                rec.echange_service_id.membre_vendeur
                and rec.echange_service_id.membre_vendeur.id
                != rec.membre_id.id
            ):
                lst_msg.append(
                    f"Membre : '{rec.echange_service_id.membre_vendeur.nom}'"
                )
                rec.membre_logo = (
                    rec.echange_service_id.membre_vendeur.logo_attachment_id.local_url
                )
            if rec.echange_service_id.offre_service:
                lst_msg.append(
                    f"Offre : '{rec.echange_service_id.offre_service.titre}'"
                )
            if rec.echange_service_id.demande_service:
                lst_msg.append(
                    "Demande :"
                    f" '{rec.echange_service_id.demande_service.titre}'"
                )
            rec.name = " - ".join(lst_msg)

    @api.depends("membre_id")
    def _compute_membre_name(self):
        for rec in self:
            if rec.membre_id:
                rec.membre_name = rec.membre_id.nom
            else:
                rec.membre_name = ""

    @api.model_create_multi
    def create(self, vals_list):
        res = super().create(vals_list)
        for rec in res:
            data = rec.first_to_json()
            self.env["bus.bus"].sendone(
                # f'["{self._cr.dbname}","{self._name}",{rec.id}]',
                "accorderie.notification.echange",
                {
                    "timestamp": str(datetime.now()),
                    "data": data,
                    "field_id": rec.id,
                    "canal": f'["{self._cr.dbname}","{self._name}",{rec.membre_id.id}]',
                },
            )
        return res

    @api.multi
    def write(self, vals):
        res = super().write(vals)
        for rec in self:
            data = rec.first_to_json()
            self.env["bus.bus"].sendone(
                # f'["{self._cr.dbname}","{self._name}",{rec.id}]',
                "accorderie.notification.echange",
                {
                    "timestamp": str(datetime.now()),
                    "data": data,
                    "field_id": rec.id,
                    "canal": f'["{self._cr.dbname}","{self._name}","UPDATE",{rec.membre_id.id}]',
                },
            )
        return res
