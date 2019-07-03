-- START FIRST QUERY tba21.collections

INSERT INTO tba21.collections(
  created_at,
  updated_at,
  time_produced,
  status,
  concept_tags,
  keyword_tags,
  place,
  country_or_ocean,
  creators,
  contributor,
  directors,
  writers,
  collaborators,
  exhibited_at,
  series,
  isbn,
  edition,
  publisher,
  interviewers,
  interviewees,
  cast_,
  title,
  description,
  geom
)
VALUES (
  '2011-07-01 06:30:30+05',
  '2011-07-01 06:30:30+05',
  '2011-07-01 06:30:30+05',
  'true',
  '{2}',
  '{3,4}',
  'Place Australia',
  'Atlantic Ocean',
  '{Creators, Jacob Yeo, Tim Zerner}',
  '7e32b7c6-c6d3-4e70-a101-12af2df21a19',
  '{Directors, Nate Sowerby, Stuart Buttigieg}',
  '{Writers, Emily Pulleine, Rhett Barker}',
  '{Collaborators, Meghan Ellis, Gary Sansone}',
  'exhibited_at',
  'series',
  8157768889993,
  1,
  '{publisher World Scientific}',
  '{Interviewers, Isabelle Vem, Trenton Voytko}',
  '{Interviewees, Abby James}',
  'cast_, Lorenzo Botavara, Qui Huynh, Jesse Overmyer',
  'The Decisive Moment',
  'Description of The Decisive Moment. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi non eros pulvinar tortor auctor tincidunt congue quis sem. Donec id sem non neque tincidunt mollis ac sed nulla.',
  ST_GeomFromText('LINESTRING(-71.160281 42.258729,-71.160837 42.259113,-71.161144 42.25932)', 4326)
), (
  '2011-07-01 06:30:30+05',
  '2011-07-01 06:30:30+05',
  '2011-07-01 06:30:30+05',
  'true',
  '{1,2,3}',
  '{}',
  'Place New Zealand',
  'Indian Ocean',
  '{Creators, Lemon Washington, Terra Newell}',
  '7ba0060a-064b-489d-a7de-a30866a510d0',
  '{Directors, Phoebe Croxford, Lauren Adriaans}',
  '{Writers, Peter Chambers, Kris Cetinski}',
  '{Collaborators, James Chao, Amy Lee}',
  'exhibited_at Museum',
  'series 9',
  8157768889993,
  1,
  '{publisher Boccara}',
  '{Interviewers, IGeogina Williams, Jazmin Fleming}',
  '{Interviewees, Ashton Brenton, Taxa Obscura}',
  'cast_, Raymond Willard, Mindy Norman, Rose Gray',
  'Detonation',
  'Description of Detonation. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi non eros pulvinar tortor auctor tincidunt congue quis sem. Donec id sem non neque tincidunt mollis ac sed nulla.',
  ST_GeomFromText('LINESTRING(-71.160281 42.258729,-71.160837 42.259113,-71.161144 42.25932)', 4326)
), (
  '2011-07-01 06:30:30+05',
  '2011-07-01 06:30:30+05',
  '2011-07-01 06:30:30+05',
  'true',
  '{}',
  '{3,4}',
  'Place Indonesia',
  'Pacific Ocean',
  '{Creators, Vanja Kitanovic, Omar Leo}',
  '4b5981b0-6897-46de-b36e-1ebd125fc1cb',
  '{Directors, Miranda Salander, Mauve Amethyst}',
  '{Writers, Dean Michael, Harley Jaque}',
  '{Collaborators, Josh Robbins, Amy Lee}',
  'exhibited_at Tesla Motors',
  'series 1',
  8157768889993,
  1,
  '{publisher Addison Wesley}',
  '{Interviewers, Jack Mac}',
  '{Interviewees, Lauren Austen, James El}',
  'cast_, Georgi Coddington, Lucy Garland, Amanda McCallum',
  'Quantum Aspects of Life',
  'Quantum Aspects of Life. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi non eros pulvinar tortor auctor tincidunt congue quis sem. Donec id sem non neque tincidunt mollis ac sed nulla.',
  ST_GeomFromText('LINESTRING(-71.160281 42.258729,-71.160837 42.259113,-71.161144 42.25932)', 4326)
),(
  '2011-07-01 06:30:30+05',
  '2011-07-01 06:30:30+05',
  '2011-07-01 06:30:30+05',
  'true',
  '{}',
  '{}',
  '',
  '',
  '{}',
  '1f89f9b6-39bc-416e-899e-ef1a8d656f24',
  '{}',
  '{}',
  '{}',
  'e',
  '',
   8157768889993,
   2,
  '{}',
  '{}',
  '{}',
  '',
  '',
  '',
  ST_GeomFromText('LINESTRING(-71.160281 42.258729,-71.160837 42.259113,-71.161144 42.25932)', 4326)
);

-- END FIRST QUERY tba21.collections
