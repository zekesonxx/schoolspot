import { Router } from 'itty-router';

// Create a new router
const router = Router();

/*
Our index route, a simple hello world.
*/
router.get('/', () => {
	return new Response('oh hi');
});

router.get('/favicon*', () => {
	return new Response('', { status: 404});
});

/*
This shows a different HTTP method, a POST.
Try send a POST request using curl or another tool.
Try the below curl command to send JSON:
$ curl -X POST <worker> -H "Content-Type: application/json" -d '{"abc": "def"}'
*/
router.post('/hamalert/:uuid', async (request, env, context) => {
	// make sure it's the right uuid
	if (request.params.uuid != env.uuid) {
		return new Response('Not Authorized', { status: 401 });
	}
	// make sure we have form data
	const contentType = request.headers.get('content-type');
	if (!contentType || !contentType.includes('form')) {
		return new Response('No Form Data', { status: 400 });
	}
	// get the form data
	const formData = await request.formData();
	const body = {};
	for (const entry of formData.entries()) {
	  body[entry[0]] = entry[1];
	}
	// debugging
	console.log('hamalert data: ' + JSON.stringify(body));

	var webhook_data = {
		allowed_mentions: {
			roles: ["1074807344141176872"]
		}
	};
	if (body.triggerComment.includes('Schools') 
		|| (body.comment || '').toLowerCase().includes('school') 
		|| (body.comment || '').toLowerCase().includes('scr')) {
		webhook_data.content = "<@&1074807344141176872> School Spotted!";
	} else {
		webhook_data.content = 'A spot for you:';
	}
	webhook_data.embeds = [
		{
			title: body.title,
			footer: {
				text: body.rawText
			},
			author: {
				name: `QRZ link to ${body.callsign}`,
				url: `https://www.qrz.com/db/${body.callsign}`
			},
			fields: [
				{
					name: "Callsign",
					value: body.callsign,
					inline: true
				},
				{
					name: "Frequency",
					value: `${body.frequency} MHz`,
					inline: true
				},
				{
					name: "Band",
					value: `${body.band} ${(body.modeDetail || '').toUpperCase()}`,
					inline: true
				},
				{
					name: "Spotted by",
					value: body.spotter,
					inline: true
				},
				{
					name: "Spotted at",
					value: `${body.time} UTC`,
					inline: true
				}
			]
		}
	];

	if (body.state && body.state != '') {
		webhook_data.embeds[0].fields.push({
			name: "State",
			value: body.state,
			inline: true
		});
	}

	const init = {
		body: JSON.stringify(webhook_data),
		method: 'POST',
		headers: {
			'content-type': 'application/json;charset=UTF-8',
		},
	};
	const response = await fetch(env.discord_webhook_url+'?wait=true', init);
	console.log('response from discord: ' + JSON.stringify(await response.json()));


	return new Response('thanks!');
});

/*
This is the last route we define, it will match anything that hasn't hit a route we've defined
above, therefore it's useful as a 404 (and avoids us hitting worker exceptions, so make sure to include it!).
Visit any page that doesn't exist (e.g. /foobar) to see it in action.
*/
router.all('*', () => new Response('404', { status: 404 }));

export default {
	fetch: router.handle,
};