// GLOBAL VARIABLES //
const API_ROOT = 'https://klimateam-schoental.de/wp-json/tribe/events/v1/';
const CATEGORY_TODAY_WP_ID = 12;
const today = new Date();
const wpCredentials = process.env.WP_CREDENTIALS;

// GLOBAL COMPUTED VALUES //
const formattedToday = formatDate(today);
const lastYear = new Date(today);
lastYear.setFullYear(today.getFullYear() - 1);
const formattedLastYear = formatDate(lastYear);
const nextYear = new Date(today);
nextYear.setFullYear(today.getFullYear() + 1);
const formattedNextYear = formatDate(nextYear);
const base64 = Buffer.from(wpCredentials).toString('base64');


// EXECUTION //
main();


// MAIN //
async function main() {
  // check ENV variables
  if (!wpCredentials) {
    console.error('ERROR: no credentials provided in ENV');
    console.info('wpCredentials', wpCredentials);
    return 1;
  }

  // first reset all events so they don't have the today category
  const res = await getEventsWithCategoryToday();
  if (res.ok) {
    const eventsWithCategoryToday = await res.json();
    if (eventsWithCategoryToday.length > 0) {
      for (const event of eventsWithCategoryToday) {
        const newCategories = event.categories
          .filter(c => c.id !== CATEGORY_TODAY_WP_ID)
          .map(c => c.id);
        console.info(`Trying to remove category 'HEUTE' from event ${event.url} (${event.id})`);
        const res = await setCategory(event, newCategories);
        if (!res.ok) {
          console.error(`ERROR: could not remove category 'HEUTE' from event ${event.url} (${event.id})`);
        } else {
          console.info('SUCCESS: Successfully removed category');
        }
        console.log('');
      }
    } else {
      console.info("INFO: no events found to reset with category 'today'");
    }
  } else {
    console.error(`ERROR: could not get events with category today`)
    await writeError(res);
    return 2;
  }

  // loop over every event that takes place today and set the category today on every event
  const res2 = await getTodaysEvent();
  if (res2.ok) {
    const todaysEvents = await res2.json().then(r => r.events);
    if (todaysEvents.length > 0) {
      for (const event of todaysEvents) {
        const currentCategoryIds = event.categories.map(c => c.id);
        let newCategories = currentCategoryIds;
        if (!currentCategoryIds.includes(CATEGORY_TODAY_WP_ID)) {
          newCategories.push(currentCategoryIds);
        }
        console.info(`INFO: Trying to set category 'HEUTE' for event ${event.url} (${event.id})`);
        const res = await setCategory(event, newCategories);
        if (!res.ok) {
          console.error(`ERROR: could not set category 'HEUTE' for event ${event.url} (${event.id})`);
        } else {
          console.info('SUCCESS: Successfully added category');
        }
        console.log('');
      }
    } else {
      console.info("no events found today that would need the category 'today'");
    }
  } else {
    console.error(`ERROR: could not get todays events`);
    await writeError(res2);
    return 3;
  }
}


// FUNCTIONS //
function getEventsWithCategoryToday() {
  const url = new URL('events', API_ROOT);
  url.searchParams.append('starts_after', formattedLastYear);
  url.searchParams.append('ends_before', formattedNextYear);
  url.searchParams.append('categories', CATEGORY_TODAY_WP_ID.toString());
  console.log(`DEBUG: request-URL: ${url.toString()}`);
  return fetch(url, {
    method: 'GET'
  });
}

function getTodaysEvent() {
  const url = new URL('events', API_ROOT);
  url.searchParams.append('start_date', formattedToday);
  url.searchParams.append('end_date', formattedToday);
  console.log(`DEBUG: request-URL: ${url.toString()}`);
  return fetch(url, {
    method: 'GET'
  });
}

function setCategory(event, categories) {
  const myHeaders = new Headers();
  myHeaders.append("Authorization", `Basic ${base64}`);
  myHeaders.append("Content-Type", "application/json");

  const raw = JSON.stringify({ "categories": categories });

  const requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
    redirect: 'follow'
  };

  const url = new URL(`events/${event.id}`, API_ROOT);
  console.log(`DEBUG: request-URL: ${url.toString()}`);
  return fetch(url, requestOptions);
}

function formatDate(date) {
  let d = new Date(date),
    month = '' + (d.getMonth() + 1),
    day = '' + d.getDate(),
    year = d.getFullYear();

  if (month.length < 2)
    month = '0' + month;
  if (day.length < 2)
    day = '0' + day;

  return [year, month, day].join('-');
}

async function writeError(response) {
  console.error(`${response.status}: ${response.statusText}`);
  const json = await response.json();
  console.error(json);
}
