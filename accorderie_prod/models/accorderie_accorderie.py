from odoo import _, api, fields, models


class AccorderieAccorderie(models.Model):
    _inherit = "accorderie.accorderie"

    company_id = fields.Many2one(
        "res.company",
        string="Company",
        default=lambda s: s.env["res.company"]._company_default_get(
            "ir.sequence"
        ),
    )

    nom = fields.Char(
        related="company_id.name",
    )

    telephone = fields.Char(
        related="company_id.phone",
    )
