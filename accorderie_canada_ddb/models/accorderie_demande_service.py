from datetime import datetime

from odoo import _, api, fields, models


class AccorderieDemandeService(models.Model):
    _name = "accorderie.demande.service"
    _inherit = "portal.mixin"
    _description = "Accorderie Demande Service"
    _rec_name = "titre"
    _order = "create_date desc"

    titre = fields.Char()

    accorderie = fields.Many2one(comodel_name="accorderie.accorderie")

    active = fields.Boolean(
        string="Actif",
        default=True,
        help=(
            "Lorsque non actif, cet demande de services n'est plus en"
            " fonction, mais demeure accessible."
        ),
    )

    approuver = fields.Boolean(
        string="Approuvé",
        help="Permet d'approuver cette demande de service.",
    )

    commentaire = fields.One2many(
        comodel_name="accorderie.commentaire",
        inverse_name="demande_service_id",
        help="Commentaire relation",
    )

    date_debut = fields.Date(string="Date début")

    date_fin = fields.Date(string="Date fin")

    description = fields.Char()

    membre = fields.Many2one(comodel_name="accorderie.membre")

    membre_favoris_ids = fields.Many2many(comodel_name="accorderie.membre")

    publie = fields.Boolean(
        string="Demande publié",
        help="La demande est publiée, sinon il est privée.",
        default=True,
    )

    type_service_id = fields.Many2one(
        comodel_name="accorderie.type.service",
        string="Type de services",
    )

    @api.multi
    def write(self, vals):
        status = super().write(vals)
        # Detect user
        accorderie_member = (
            self.env["res.users"]
            .browse(self.write_uid.id)
            .partner_id.accorderie_membre_ids
        )
        for rec in self:
            self.env["bus.bus"].sendone(
                # f'["{self._cr.dbname}","{self._name}",{rec.id}]',
                "accorderie.notification.favorite",
                {
                    "timestamp": str(datetime.now()),
                    "data": vals,
                    "field_id": rec.id,
                    "canal": f'["{self._cr.dbname}","{self._name}",{accorderie_member.id}]',
                },
            )
        return status

    def _compute_access_url(self):
        super(AccorderieDemandeService, self)._compute_access_url()
        for accorderie_demande_service in self:
            accorderie_demande_service.access_url = (
                "/my/accorderie_demande_service/%s"
                % accorderie_demande_service.id
            )
