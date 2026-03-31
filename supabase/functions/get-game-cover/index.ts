const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Check if there is a body before trying to parse it
    if (!req.body) {
      return new Response(JSON.stringify({ error: 'Request body is missing' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const { gameTitle } = await req.json()

    if (!gameTitle) {
      return new Response(JSON.stringify({ error: 'gameTitle is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const clientId = Deno.env.get('IGDB_CLIENT_ID')
    const clientSecret = Deno.env.get('IGDB_CLIENT_SECRET')

    if (!clientId || !clientSecret) {
      throw new Error('IGDB credentials are not configured')
    }

    // 1. Get Twitch Access Token
    const tokenResponse = await fetch(
      `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
      { method: 'POST' }
    )

    if (!tokenResponse.ok) {
      throw new Error(`Failed to get Twitch token: ${tokenResponse.statusText}`)
    }

    const tokenData = await tokenResponse.json()
    const access_token = tokenData.access_token

    // 2. Query IGDB API
    const igdbResponse = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${access_token}`,
        'Accept': 'application/json',
      },
      body: `search "${gameTitle}"; fields name, cover.url; limit 1;`
    })

    if (!igdbResponse.ok) {
      throw new Error(`Failed to query IGDB: ${igdbResponse.statusText}`)
    }

    const games = await igdbResponse.json()

    if (!games || games.length === 0 || !games[0].cover || !games[0].cover.url) {
      return new Response(JSON.stringify({ coverUrl: null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 3. Format URL
    let coverUrl = games[0].cover.url
    if (coverUrl.startsWith('//')) {
      coverUrl = `https:${coverUrl}`
    }
    coverUrl = coverUrl.replace('t_thumb', 't_cover_big')

    return new Response(JSON.stringify({ coverUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
