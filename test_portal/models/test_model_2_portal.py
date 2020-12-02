# -*- coding: utf-8 -*-

from odoo import _, api, models, fields


class TestModel2Portal(models.Model):
    _inherit = 'portal.mixin'
    _name = 'test.model_2.portal'
    _description = 'test_model_2_portal'

    model_1 = fields.Many2one(
        string='Model 1',
        comodel_name='test.model.portal',
        on_delete='set null',
    )

    name = fields.Char(
        string='Name',
    )
