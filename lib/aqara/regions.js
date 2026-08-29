'use strict';

/** Aqara Open Platform API domains documented by Aqara. */
const REGIONS = Object.freeze({
  EU: { id: 'EU', label: 'Europe', api: 'https://open-ger.aqara.com/v3.0/open/api', oauth: 'https://open-ger.aqara.com/v3.0/open' },
  US: { id: 'US', label: 'United States', api: 'https://open-usa.aqara.com/v3.0/open/api', oauth: 'https://open-usa.aqara.com/v3.0/open' },
  CN: { id: 'CN', label: 'China Mainland', api: 'https://open-cn.aqara.com/v3.0/open/api', oauth: 'https://open-cn.aqara.com/v3.0/open' },
  KR: { id: 'KR', label: 'South Korea', api: 'https://open-kr.aqara.com/v3.0/open/api', oauth: 'https://open-kr.aqara.com/v3.0/open' },
  RU: { id: 'RU', label: 'Russia', api: 'https://open-ru.aqara.com/v3.0/open/api', oauth: 'https://open-ru.aqara.com/v3.0/open' },
  SG: { id: 'SG', label: 'Singapore', api: 'https://open-sg.aqara.com/v3.0/open/api', oauth: 'https://open-sg.aqara.com/v3.0/open' },
});

function getRegion(id = 'EU') {
  const region = REGIONS[String(id).toUpperCase()];
  if (!region) throw new Error(`Unsupported Aqara region: ${id}`);
  return region;
}

module.exports = { REGIONS, getRegion };
