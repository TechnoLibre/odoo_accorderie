from odoo import _, api, fields, models


class AccorderieAccorderie(models.Model):
    _name = "accorderie.accorderie"
    _inherit = ["mail.activity.mixin", "mail.thread"]
    _description = "Les Accorderies"
    _rec_name = "nom"

    nom = fields.Char(
        required=True,
        help="Nom de l'Accorderie",
        track_visibility="onchange",
    )

    active = fields.Boolean(
        string="Actif",
        default=True,
        help=(
            "Lorsque non actif, cette accorderie n'est plus en fonction, mais"
            " demeure accessible."
        ),
        track_visibility="onchange",
    )

    adresse = fields.Char(
        help="Adresse de l'Accorderie",
        track_visibility="onchange",
    )

    arrondissement = fields.Many2one(
        comodel_name="accorderie.arrondissement",
        help="Nom de l'Arrondissement qui contient l'Accorderie.",
        track_visibility="onchange",
    )

    code_postal = fields.Char(
        string="Code postal",
        help="Code postal de l'Accorderie",
        track_visibility="onchange",
    )

    courriel = fields.Char(
        string="Adresse courriel",
        help="Adresse courriel pour joindre l'Accorderie.",
        track_visibility="onchange",
    )

    grp_achat_administrateur = fields.Boolean(
        string="Groupe d'achats des administrateurs",
        help=(
            "Permet de rendre accessible les achats pour les administrateurs."
        ),
        track_visibility="onchange",
    )

    grp_achat_membre = fields.Boolean(
        string="Groupe d'achats membre",
        help="Rend accessible les achats pour les Accordeurs.",
        track_visibility="onchange",
    )

    logo = fields.Binary(help="Logo de l'Accorderie")

    membre = fields.One2many(
        comodel_name="accorderie.membre",
        inverse_name="accorderie",
        help="Membre relation",
    )

    message_accueil = fields.Html(
        string="Message d'accueil",
        help="Message à afficher pour accueillir les membres.",
        track_visibility="onchange",
    )

    message_grp_achat = fields.Html(
        string="Message groupe d'achats",
        help="Message à afficher pour les groupes d'achats.",
        track_visibility="onchange",
    )

    region = fields.Many2one(
        comodel_name="accorderie.region",
        string="Région administrative",
        help="Nom de la région administrative de l'Accorderie",
        track_visibility="onchange",
    )

    sequence = fields.Integer(
        string="Séquence",
        help="Séquence d'affichage",
    )

    telecopieur = fields.Char(
        string="Télécopieur",
        help="Numéro de télécopieur pour joindre l'Accorderie.",
        track_visibility="onchange",
    )

    telephone = fields.Char(
        string="Téléphone",
        help="Numéro de téléphone pour joindre l'Accorderie.",
        track_visibility="onchange",
    )

    url_public = fields.Char(
        string="Lien du site web publique",
        help="Lien du site web publique de l'Accorderie",
        track_visibility="onchange",
    )

    url_transactionnel = fields.Char(
        string="Lien du site web transactionnel",
        help="Lien du site web transactionnel de l'Accorderie",
        track_visibility="onchange",
    )

    ville = fields.Many2one(
        comodel_name="accorderie.ville",
        help="Nom de la ville de l'Accorderie",
        track_visibility="onchange",
    )
