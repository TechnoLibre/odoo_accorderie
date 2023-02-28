from odoo import _, api, fields, models


class AccorderieRegion(models.Model):
    _name = "accorderie.region"
    _description = "Accorderie Region"
    _rec_name = "nom"

    nom = fields.Char()

    accorderie = fields.One2many(
        string="Réseau",
        comodel_name="accorderie.accorderie",
        inverse_name="region",
        help="Relation du réseau",
    )

    code = fields.Integer(
        string="Code de région",
        required=True,
        help="Code de la région administrative",
    )

    membre = fields.One2many(
        comodel_name="accorderie.membre",
        inverse_name="region",
        help="Membre relation",
    )

    ville = fields.One2many(
        comodel_name="accorderie.ville",
        inverse_name="region",
        help="Ville relation",
    )
