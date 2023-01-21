from odoo import _, api, fields, models


class AccorderieDemandeService(models.Model):
    _name = "accorderie.demande.service"
    _inherit = ["accorderie.demande.service", "tier.validation"]

    state = fields.Selection(
        [
            ("draft", "À approuver"),
            ("cancel", "Annulé"),
        ],
        string="Status",
        default="draft",
        copy=False,
        index=True,
        readonly=True,
        help="Status de la demande de service",
    )

    @api.multi
    def write(self, vals):
        lst_copy_val_tier_review = []
        tier_review_ids = None
        if "active" in vals.keys():
            active = vals.get("active")
            tier_review_ids = self.env["tier.review"].search(
                [
                    ("model", "=", "accorderie.demande.service"),
                    ("res_id", "=", self.id),
                ]
            )
            if not active:
                # Disable review
                vals["state"] = "cancel"
            else:
                # Enable review and recreate tier_review
                vals["state"] = "draft"
                if tier_review_ids:
                    for tier_review_id in tier_review_ids:
                        copy_val_tier_review = {
                            "create_date": tier_review_id.create_date,
                            "status": tier_review_id.status,
                            "model": tier_review_id.model,
                            "res_id": tier_review_id.res_id,
                            "definition_id": tier_review_id.definition_id.id,
                            "sequence": tier_review_id.sequence,
                            "todo_by": tier_review_id.todo_by,
                            "done_by": tier_review_id.done_by.id,
                            "requested_by": tier_review_id.requested_by.id,
                            "reviewed_date": tier_review_id.reviewed_date,
                            "comment": tier_review_id.comment,
                            "create_uid": tier_review_id.create_uid.id,
                            "write_uid": tier_review_id.write_uid.id,
                        }
                        lst_copy_val_tier_review.append(copy_val_tier_review)
        status = super().write(vals)
        if lst_copy_val_tier_review and not tier_review_ids.exists():
            for copy_val_tier_review in lst_copy_val_tier_review:
                self.env["tier.review"].create(copy_val_tier_review)
        return status
