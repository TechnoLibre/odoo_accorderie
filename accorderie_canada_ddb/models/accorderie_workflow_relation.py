from odoo import _, api, fields, models


class AccorderieWorkflowRelation(models.Model):
    _name = "accorderie.workflow.relation"
    _description = "Accorderie Workflow Relation"

    name = fields.Char(string="Nom")

    active = fields.Boolean(
        string="Actif",
        default=True,
        help="Lorsque non actif, cette relation n'est plus visible.",
    )

    body_html = fields.Html(string="HTML")

    diagram_id = fields.Many2one(
        comodel_name="accorderie.workflow",
        string="Diagram",
    )

    icon = fields.Char(string="icon")

    # TODO create a variable to detect if state_src contains a type selection_dynamique to enable is_dynamic
    is_dynamic = fields.Boolean(
        string="Is dynamic", help="Use for type selection_dynamique"
    )

    state_dst = fields.Many2one(
        comodel_name="accorderie.workflow.state",
        string="State destination",
    )

    state_src = fields.Many2one(
        comodel_name="accorderie.workflow.state",
        string="State source",
    )
