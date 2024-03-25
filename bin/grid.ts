const fetchJSON = (url: string) => fetch(url).then((res) => res.json());

const fetchIncident = (id: string, region: string, feedTime: number) => {
  const url =
    `https://powercuts.nationalgrid.co.uk/__powercuts/getIncidentById` +
    `?feedTime=${feedTime}&incidentId=${id}&region=${region}`;
  return fetchJSON(url).catch((e) => {});
};

const regionMap = {
  "East Midlands": "EM",
  "West Midlands": "WM",
  "South Wales": "SWA",
  "South West": "SWE",
};
//1711370400000

interface Incident {
  loc: [number, number];
  id: string;
  region: keyof typeof regionMap;
}

const fetchReport = async () => {
  const report = await fetchJSON(
    "https://powercuts.nationalgrid.co.uk/__powercuts/getIncidentsAndAlertSummary",
  );

  const lastUpdated = new Date(report.lastUpdated).getTime();
  const incidents = await Promise.all(
    report.incidents.map((i: Incident) =>
      fetchIncident(i.id, regionMap[i.region], lastUpdated)
    ),
  );
  return { report, incidents };
};

const info = await fetchReport();
console.log(JSON.stringify(info, null, 2));
