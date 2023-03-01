from odoo import http
from odoo.addons.portal.controllers.web import Home
from odoo.addons.website.controllers.main import Website
from odoo.http import request

DEFAULT_REDIRECT = "/explorer"


class CustomHome(Home):
    def _login_redirect(self, uid, redirect=None, **post):
        if not redirect and not request.env["res.users"].sudo().browse(
            uid
        ).has_group("base.group_user"):
            return super(CustomHome, self)._login_redirect(
                uid, redirect=DEFAULT_REDIRECT
            )
        return super(CustomHome, self)._login_redirect(uid, redirect=redirect)


class CustomWebsite(Website):
    @http.route(website=True, auth="public")
    def web_login(self, redirect=None, *args, **kw):
        response = super(CustomWebsite, self).web_login(
            redirect=redirect, *args, **kw
        )
        if not redirect and request.params["login_success"]:
            if (
                request.env["res.users"]
                .browse(request.uid)
                .has_group("base.group_user")
            ):
                redirect = b"/web?" + request.httprequest.query_string
            else:
                if request.httprequest.query_string:
                    redirect = (
                        f"{DEFAULT_REDIRECT}?".encode()
                        + request.httprequest.query_string
                    )
                else:
                    redirect = DEFAULT_REDIRECT
            return http.redirect_with_hash(redirect)
        return response
