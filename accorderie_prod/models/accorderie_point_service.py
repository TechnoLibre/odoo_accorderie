from odoo import _, api, fields, models


class AccorderiePointService(models.Model):
    _inherit = "accorderie.point.service"

    nom = fields.Char(
        string="Nom",
        related="company_id.name",
        readonly=False,
    )

    company_id = fields.Many2one(
        "res.company",
        string="Company",
    )

    partner_id = fields.Many2one(
        "res.partner",
        string="Partner",
        related="company_id.partner_id",
    )
