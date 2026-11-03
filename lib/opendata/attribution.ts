/** Required attribution strings for open-data reuse (see docs/SOURCE_POLICY_CHECK.md). */

export const OGL_CANADA = {
  id: "ogl-canada",
  shortName: "Open Government Licence – Canada",
  url: "https://open.canada.ca/en/open-government-licence-canada",
  statement:
    "Contains information licensed under the Open Government Licence – Canada.",
} as const;

export const OGL_NOVA_SCOTIA = {
  id: "ogl-nova-scotia",
  shortName: "Open Government Licence – Nova Scotia",
  url: "https://novascotia.ca/opendata/licence.asp",
  statement:
    "Contains information licensed under the Open Government Licence – Nova Scotia.",
} as const;

export type LicenceRef = typeof OGL_CANADA | typeof OGL_NOVA_SCOTIA;

export const FEED_LICENCES = {
  gcsurplus_sold: OGL_CANADA,
  canadabuys_tenders: OGL_CANADA,
  ns_surplus_tender: OGL_NOVA_SCOTIA,
  ns_surplus_real_property: OGL_NOVA_SCOTIA,
} as const;
