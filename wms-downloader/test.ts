#!/usr/bin/env tsx

/**
 * Quick test to verify WMS connectivity
 */

async function testFetch() {
  try {
    console.log('Testing fetch API...');
    const url = 'https://view.eumetsat.int/geoserver/msg_iodc/ir108/ows?service=WMS&request=GetCapabilities&version=1.3.0';

    console.log('Fetching:', url);
    const response = await fetch(url);

    console.log('Status:', response.status);
    console.log('OK:', response.ok);

    const text = await response.text();
    console.log('Response length:', text.length);
    console.log('First 500 chars:', text.substring(0, 500));

  } catch (error) {
    console.error('Fetch error:', error);
  }
}

testFetch();
