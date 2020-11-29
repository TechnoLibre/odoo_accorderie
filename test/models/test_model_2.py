# -*- coding: utf-8 -*-

from odoo import api, models, fields


class TestModel2(models.Model):
    _name = 'test.model_2'
    _description = 'test_model_2'

    mom = fields.Many2one(
        string='mom',
        comodel_name='test.model',
        on_delete='set null',
    )

    name = fields.Char(
        string='Name',
        copy=False,
    )
