from odoo import _, api, fields, models


class AccorderieVille(models.Model):
    _name = "accorderie.ville"
    _description = "Accorderie Ville"
    _rec_name = "nom"

    nom = fields.Char()

    accorderie = fields.One2many(
        string="Réseau",
        comodel_name="accorderie.accorderie",
        inverse_name="ville",
        help="Relation du réseau",
    )

    arrondissement = fields.One2many(
        comodel_name="accorderie.arrondissement",
        inverse_name="ville",
        help="Arrondissement relation",
    )

    code = fields.Integer(
        required=True,
        help="Code de la ville",
    )

    membre = fields.One2many(
        comodel_name="accorderie.membre",
        inverse_name="ville",
        help="Membre relation",
    )

    region = fields.Many2one(
        comodel_name="accorderie.region",
        string="Région",
    )
