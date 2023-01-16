from odoo import _, api, fields, models


class AccorderieAccorderie(models.Model):
    _inherit = "accorderie.accorderie"

    # TODO support active in res.company

    company_id = fields.Many2one(
        "res.company",
        string="Company",
        default=lambda s: s.env["res.company"]._company_default_get(
            "ir.sequence"
        ),
    )

    partner_id = fields.Many2one(
        "res.partner",
        string="Partner",
        related="company_id.partner_id",
    )

    nom = fields.Char(
        related="company_id.name",
        readonly=False,
    )

    active = fields.Boolean(
        related="partner_id.active",
        readonly=False,
    )

    adresse = fields.Char(
        related="company_id.street",
        readonly=False,
    )

    code_postal = fields.Char(
        related="company_id.zip",
        readonly=False,
    )

    telephone = fields.Char(
        related="company_id.phone",
        readonly=False,
    )

    telecopieur = fields.Char(
        related="partner_id.fax",
        readonly=False,
    )

    courriel = fields.Char(
        related="company_id.email",
        readonly=False,
    )

    logo = fields.Binary(
        related="company_id.logo",
        readonly=False,
    )
