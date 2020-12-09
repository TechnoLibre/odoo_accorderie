from collections import OrderedDict
from operator import itemgetter

from odoo import http, _
from odoo.exceptions import AccessError, MissingError
from odoo.http import request
from odoo.addons.portal.controllers.portal import CustomerPortal, pager as portal_pager
from odoo.tools import groupby as groupbyelem

from odoo.osv.expression import OR


class CustomerPortal(CustomerPortal):

    def _prepare_portal_layout_values(self):
        values = super(CustomerPortal, self)._prepare_portal_layout_values()
        values['test_model_2_portal_count'] = request.env['test.model_2.portal'].search_count([])
        values['test_model_portal_count'] = request.env['test.model.portal'].search_count([])
        return values

    # ------------------------------------------------------------
    # My Test Model_2 Portal
    # ------------------------------------------------------------
    def _test_model_2_portal_get_page_view_values(self, test_model_2_portal, access_token, **kwargs):
        values = {
            'page_name': 'test_model_2_portal',
            'test_model_2_portal': test_model_2_portal,
            'user': request.env.user
        }
        return self._get_page_view_values(test_model_2_portal, access_token, values, 'my_test_model_2_portals_history',
                                          False, **kwargs)

    @http.route(['/my/test_model_2_portals', '/my/test_model_2_portals/page/<int:page>'], type='http', auth="user",
                website=True)
    def portal_my_test_model_2_portals(self, page=1, date_begin=None, date_end=None, sortby=None, filterby=None,
                                       search=None, search_in='content', **kw):
        values = self._prepare_portal_layout_values()
        TestModel2Portal = request.env['test.model_2.portal']
        domain = []

        searchbar_sortings = {
            'date': {'label': _('Newest'), 'order': 'create_date desc'},
            'name': {'label': _('Name'), 'order': 'name'},
        }
        searchbar_filters = {
            'all': {'label': _('All'), 'domain': []},
        }
        searchbar_inputs = {
        }
        searchbar_groupby = {
        }

        # default sort by value
        if not sortby:
            sortby = 'date'
        order = searchbar_sortings[sortby]['order']
        # default filter by value
        if not filterby:
            filterby = 'all'
        domain = searchbar_filters[filterby]['domain']

        # search
        if search and search_in:
            search_domain = []
            domain += search_domain
        # archive groups - Default Group By 'create_date'
        archive_groups = self._get_archive_groups('test.model_2.portal', domain)
        if date_begin and date_end:
            domain += [('create_date', '>', date_begin), ('create_date', '<=', date_end)]
        # test_model_2_portals count
        test_model_2_portal_count = TestModel2Portal.search_count(domain)
        # pager
        pager = portal_pager(
            url="/my/test_model_2_portals",
            url_args={'date_begin': date_begin, 'date_end': date_end, 'sortby': sortby, 'filterby': filterby,
                      'search_in': search_in, 'search': search},
            total=test_model_2_portal_count,
            page=page,
            step=self._items_per_page
        )
        # content according to pager and archive selected

        # content according to pager and archive selected
        test_model_2_portals = TestModel2Portal.search(domain, order=order, limit=self._items_per_page,
                                                       offset=pager['offset'])
        request.session['my_test_model_2_portals_history'] = test_model_2_portals.ids[:100]

        values.update({
            'date': date_begin,
            'date_end': date_end,
            'test_model_2_portals': test_model_2_portals,
            'page_name': 'test_model_2_portal',
            'archive_groups': archive_groups,
            'default_url': '/my/test_model_2_portals',
            'pager': pager,
            'searchbar_sortings': searchbar_sortings,
            'searchbar_groupby': searchbar_groupby,
            'searchbar_inputs': searchbar_inputs,
            'search_in': search_in,
            'searchbar_filters': OrderedDict(sorted(searchbar_filters.items())),
            'sortby': sortby,
            'filterby': filterby,
        })
        return request.render("test_portal.portal_my_test_model_2_portals", values)

    @http.route(['/my/test_model_2_portal/<int:test_model_2_portal_id>'], type='http', auth="public", website=True)
    def portal_my_test_model_2_portal(self, test_model_2_portal_id=None, access_token=None, **kw):
        try:
            test_model_2_portal_sudo = self._document_check_access('test.model_2.portal', test_model_2_portal_id,
                                                                   access_token)
        except (AccessError, MissingError):
            return request.redirect('/my')

        values = self._test_model_2_portal_get_page_view_values(test_model_2_portal_sudo, access_token, **kw)
        return request.render("test_portal.portal_my_test_model_2_portal", values)

    # ------------------------------------------------------------
    # My Test Model Portal
    # ------------------------------------------------------------
    def _test_model_portal_get_page_view_values(self, test_model_portal, access_token, **kwargs):
        values = {
            'page_name': 'test_model_portal',
            'test_model_portal': test_model_portal,
            'user': request.env.user
        }
        return self._get_page_view_values(test_model_portal, access_token, values, 'my_test_model_portals_history',
                                          False, **kwargs)

    @http.route(['/my/test_model_portals', '/my/test_model_portals/page/<int:page>'], type='http', auth="user",
                website=True)
    def portal_my_test_model_portals(self, page=1, date_begin=None, date_end=None, sortby=None, filterby=None,
                                     search=None, search_in='content', **kw):
        values = self._prepare_portal_layout_values()
        TestModelPortal = request.env['test.model.portal']
        domain = []

        searchbar_sortings = {
            'date': {'label': _('Newest'), 'order': 'create_date desc'},
            'name': {'label': _('Name'), 'order': 'name'},
        }
        searchbar_filters = {
            'all': {'label': _('All'), 'domain': []},
        }
        searchbar_inputs = {
        }
        searchbar_groupby = {
        }

        # default sort by value
        if not sortby:
            sortby = 'date'
        order = searchbar_sortings[sortby]['order']
        # default filter by value
        if not filterby:
            filterby = 'all'
        domain = searchbar_filters[filterby]['domain']

        # search
        if search and search_in:
            search_domain = []
            domain += search_domain
        # archive groups - Default Group By 'create_date'
        archive_groups = self._get_archive_groups('test.model.portal', domain)
        if date_begin and date_end:
            domain += [('create_date', '>', date_begin), ('create_date', '<=', date_end)]
        # test_model_portals count
        test_model_portal_count = TestModelPortal.search_count(domain)
        # pager
        pager = portal_pager(
            url="/my/test_model_portals",
            url_args={'date_begin': date_begin, 'date_end': date_end, 'sortby': sortby, 'filterby': filterby,
                      'search_in': search_in, 'search': search},
            total=test_model_portal_count,
            page=page,
            step=self._items_per_page
        )
        # content according to pager and archive selected

        # content according to pager and archive selected
        test_model_portals = TestModelPortal.search(domain, order=order, limit=self._items_per_page,
                                                    offset=pager['offset'])
        request.session['my_test_model_portals_history'] = test_model_portals.ids[:100]

        values.update({
            'date': date_begin,
            'date_end': date_end,
            'test_model_portals': test_model_portals,
            'page_name': 'test_model_portal',
            'archive_groups': archive_groups,
            'default_url': '/my/test_model_portals',
            'pager': pager,
            'searchbar_sortings': searchbar_sortings,
            'searchbar_groupby': searchbar_groupby,
            'searchbar_inputs': searchbar_inputs,
            'search_in': search_in,
            'searchbar_filters': OrderedDict(sorted(searchbar_filters.items())),
            'sortby': sortby,
            'filterby': filterby,
        })
        return request.render("test_portal.portal_my_test_model_portals", values)

    @http.route(['/my/test_model_portal/<int:test_model_portal_id>'], type='http', auth="public", website=True)
    def portal_my_test_model_portal(self, test_model_portal_id=None, access_token=None, **kw):
        try:
            test_model_portal_sudo = self._document_check_access('test.model.portal', test_model_portal_id,
                                                                 access_token)
        except (AccessError, MissingError):
            return request.redirect('/my')

        values = self._test_model_portal_get_page_view_values(test_model_portal_sudo, access_token, **kw)
        return request.render("test_portal.portal_my_test_model_portal", values)
