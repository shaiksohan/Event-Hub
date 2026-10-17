import fs from 'fs';

const CAMERA_IMAGES = [
  "https://images.pexels.com/photos/23384885/pexels-photo-23384885.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/21560369/pexels-photo-21560369.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/15960708/pexels-photo-15960708.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/29486078/pexels-photo-29486078.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/16313533/pexels-photo-16313533.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/39714844/pexels-photo-39714844.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/16313526/pexels-photo-16313526.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/39714847/pexels-photo-39714847.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/39714849/pexels-photo-39714849.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg?auto=compress&cs=tinysrgb&w=1200",
];

const DRONE_IMAGES = [
  "https://images.pexels.com/photos/8204444/pexels-photo-8204444.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/38810087/pexels-photo-38810087.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/11278109/pexels-photo-11278109.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/8414416/pexels-photo-8414416.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/7124377/pexels-photo-7124377.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/8204445/pexels-photo-8204445.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/8204446/pexels-photo-8204446.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/10994596/pexels-photo-10994596.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/37455638/pexels-photo-37455638.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/18980082/pexels-photo-18980082.jpeg?auto=compress&cs=tinysrgb&w=1200",
];

const FUNCTION_IMAGES = [
  "https://images.pexels.com/photos/33485968/pexels-photo-33485968.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/33914523/pexels-photo-33914523.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/33852468/pexels-photo-33852468.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/12688995/pexels-photo-12688995.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/33914525/pexels-photo-33914525.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/14646741/pexels-photo-14646741.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/4717550/pexels-photo-4717550.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/3376769/pexels-photo-3376769.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/33852450/pexels-photo-33852450.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/14646752/pexels-photo-14646752.jpeg?auto=compress&cs=tinysrgb&w=1200",
];

const CATERING_IMAGES = [
  "https://images.pexels.com/photos/36388477/pexels-photo-36388477.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/18749077/pexels-photo-18749077.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/12253094/pexels-photo-12253094.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/16935997/pexels-photo-16935997.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/24863059/pexels-photo-24863059.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/17294719/pexels-photo-17294719.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/39388381/pexels-photo-39388381.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/28736727/pexels-photo-28736727.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/36916402/pexels-photo-36916402.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/7245469/pexels-photo-7245469.jpeg?auto=compress&cs=tinysrgb&w=1200",
];

const BIRYANI_IMAGES = [
  "https://images.pexels.com/photos/12669168/pexels-photo-12669168.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/31537385/pexels-photo-31537385.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/28909537/pexels-photo-28909537.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/31537384/pexels-photo-31537384.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/28909536/pexels-photo-28909536.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/37059699/pexels-photo-37059699.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/35539325/pexels-photo-35539325.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/8250738/pexels-photo-8250738.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/8846746/pexels-photo-8846746.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/17497626/pexels-photo-17497626.jpeg?auto=compress&cs=tinysrgb&w=1200",
];

const SOUTH_INDIAN_IMAGES = [
  "https://images.pexels.com/photos/37867687/pexels-photo-37867687.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/35539315/pexels-photo-35539315.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/35514447/pexels-photo-35514447.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/36854501/pexels-photo-36854501.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/32229637/pexels-photo-32229637.png?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/31199041/pexels-photo-31199041.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/35580913/pexels-photo-35580913.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/20282357/pexels-photo-20282357.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/9619560/pexels-photo-9619560.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/14831540/pexels-photo-14831540.jpeg?auto=compress&cs=tinysrgb&w=1200",
];

const WORKERS_IMAGES = [
  "https://images.pexels.com/photos/39204572/pexels-photo-39204572.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/29261518/pexels-photo-29261518.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/36856348/pexels-photo-36856348.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/33565506/pexels-photo-33565506.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/2897776/pexels-photo-2897776.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/13230484/pexels-photo-13230484.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/12262186/pexels-photo-12262186.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/27795342/pexels-photo-27795342.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/29775304/pexels-photo-29775304.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/12787862/pexels-photo-12787862.jpeg?auto=compress&cs=tinysrgb&w=1200",
];

const FLOWER_IMAGES = [
  "https://images.pexels.com/photos/16935921/pexels-photo-16935921.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/20199364/pexels-photo-20199364.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/17001806/pexels-photo-17001806.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/16935925/pexels-photo-16935925.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/16120134/pexels-photo-16120134.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/20609912/pexels-photo-20609912.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/32763241/pexels-photo-32763241.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/17023112/pexels-photo-17023112.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/11086770/pexels-photo-11086770.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/5708933/pexels-photo-5708933.jpeg?auto=compress&cs=tinysrgb&w=1200",
];

const SECURITY_IMAGES = [
  "https://images.pexels.com/photos/24821689/pexels-photo-24821689.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/17647335/pexels-photo-17647335.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/17543303/pexels-photo-17543303.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/34954620/pexels-photo-34954620.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/35562107/pexels-photo-35562107.png?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/34954632/pexels-photo-34954632.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/38339137/pexels-photo-38339137.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/31282368/pexels-photo-31282368.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/13602781/pexels-photo-13602781.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/33954106/pexels-photo-33954106.png?auto=compress&cs=tinysrgb&w=1200",
];

const TENT_IMAGES = [
  "https://images.pexels.com/photos/37958066/pexels-photo-37958066.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/28937190/pexels-photo-28937190.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/33115768/pexels-photo-33115768.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/37958130/pexels-photo-37958130.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/14827357/pexels-photo-14827357.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/8392460/pexels-photo-8392460.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/10994596/pexels-photo-10994596.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/4994131/pexels-photo-4994131.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/4994139/pexels-photo-4994139.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/32854451/pexels-photo-32854451.jpeg?auto=compress&cs=tinysrgb&w=1200",
];

const MEHENDI_IMAGES = [
  "https://images.pexels.com/photos/20626511/pexels-photo-20626511.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/35399382/pexels-photo-35399382.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/14694820/pexels-photo-14694820.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/19590224/pexels-photo-19590224.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/14825258/pexels-photo-14825258.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/33557605/pexels-photo-33557605.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/21568652/pexels-photo-21568652.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/8751922/pexels-photo-8751922.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/35327940/pexels-photo-35327940.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/34479816/pexels-photo-34479816.jpeg?auto=compress&cs=tinysrgb&w=1200",
];

const BIRTHDAY_IMAGES = [
  "https://images.pexels.com/photos/25956380/pexels-photo-25956380.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/39929401/pexels-photo-39929401.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/7336924/pexels-photo-7336924.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/7826296/pexels-photo-7826296.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/34008942/pexels-photo-34008942.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/7180255/pexels-photo-7180255.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/18310611/pexels-photo-18310611.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/1543762/pexels-photo-1543762.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/27175447/pexels-photo-27175447.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/30142374/pexels-photo-30142374.jpeg?auto=compress&cs=tinysrgb&w=1200",
];

const CONTENT = {
  "Wedding Photography": {
    desc: "Capture every glance, every tear, and every laugh of your wedding day with our premium photography experience. Our award-winning photographers blend candid storytelling with timeless portraiture to create a visual narrative you will treasure for generations. From the quiet morning preparations to the final dance, no moment is missed.",
    highlights: ["Award-winning photographers", "400+ professionally edited photos", "Same-day teaser reel", "Online gallery for sharing", "Premium album included", "Pre-wedding consultation"],
    inclusions: ["2 lead photographers", "8-hour coverage", "400+ edited high-resolution photos", "1 premium leather-bound album", "Online password-protected gallery", "All raw footage on USB"],
    exclusions: ["Travel outside city limits (chargeable extra)", "Additional printed albums", "Pre-wedding shoot (bookable separately)"],
    customization: ["Add drone aerial coverage", "Extend to 12-hour coverage", "Add candid-only package", "Include pre-wedding story session", "Add photo magnets for guests"],
    occasions: ["Weddings", "Receptions", "Engagement Ceremonies"],
    faqs: [
      { question: "How many photos will we receive?", answer: "You will receive 400+ professionally edited high-resolution digital photos, delivered via an online gallery within 15-20 days of the event." },
      { question: "Do you travel to outstation venues?", answer: "Yes, we cover venues outside the city. Travel and accommodation charges apply for locations beyond 50 km." },
      { question: "Can we request specific shots?", answer: "Absolutely. We schedule a pre-wedding consultation to understand your preferences, must-have shots, and family group photo requirements." },
    ],
    packages: [
      { name: "Essential", price: 35000, description: "Perfect for intimate weddings", features: ["2 photographers", "6-hour coverage", "250+ edited photos", "Online gallery", "Digital delivery"] },
      { name: "Premium", price: 55000, description: "Most popular for grand weddings", features: ["3 photographers", "10-hour coverage", "500+ edited photos", "Premium album", "Teaser reel", "Drone shots included"] },
      { name: "Cinematic", price: 85000, description: "Full luxury experience", features: ["4 photographers", "Full-day coverage", "800+ edited photos", "Luxury album + mini album", "Cinematic teaser film", "Drone + crane shots"] },
    ],
    booking_info: "A 25% advance confirms your date. The balance is due on the event day. Please book at least 2 weeks in advance.",
  },
  "Wedding Videography": {
    desc: "Your wedding film, crafted like a blockbuster. We use cinematic cameras, professional audio, and storytelling techniques to create a film that captures not just what happened, but how it felt. From the emotional exchange of vows to the energy of the dance floor, every frame is composed with intention.",
    highlights: ["Cinematic 4K filming", "Highlight reel within 7 days", "Multi-camera ceremony coverage", "Professional audio recording", "Color-graded final film", "Drone-ready production"],
    inclusions: ["2 cinematographers", "Full-day coverage (up to 10 hours)", "3-5 minute cinematic highlight film", "60-90 minute full film", "Professional lapel mics for vows", "Cinematic color grading"],
    exclusions: ["Same-day edit (requires Premium package)", "Extra copies of film on Blu-ray", "Travel outside city limits"],
    customization: ["Add same-day edit reel", "Include raw footage delivery", "Add live projection at venue", "Add pre-wedding film"],
    occasions: ["Weddings", "Receptions", "Sangeet Ceremonies"],
    faqs: [
      { question: "How long is the final wedding film?", answer: "The cinematic highlight film is 3-5 minutes, and the full documentary film runs 60-90 minutes covering all key ceremonies and moments." },
      { question: "Do you use professional audio equipment?", answer: "Yes, we use wireless lapel microphones to capture crystal-clear vows, speeches, and ceremony audio." },
      { question: "When will we receive our film?", answer: "The highlight reel is delivered within 7 days, and the full film within 30 days of the wedding." },
    ],
    packages: [
      { name: "Cinematic", price: 45000, description: "Cinematic highlight film + full coverage", features: ["2 cinematographers", "10-hour coverage", "3-5 min highlight film", "Full documentary film", "Professional audio"] },
      { name: "Premium Cinematic", price: 65000, description: "Enhanced storytelling with drone", features: ["3 cinematographers", "Full-day coverage", "5-7 min highlight film", "Drone coverage", "Same-day teaser", "Raw footage included"] },
      { name: "Luxury Film", price: 95000, description: "The ultimate wedding film experience", features: ["4 cinematographers", "Unlimited coverage", "10-min cinematic film", "Drone + crane", "Live projection", "2 highlight reels"] },
    ],
    booking_info: "A 30% advance confirms your date. Balance due on event day. Book at least 3 weeks in advance for best results.",
  },
  "Andhra Catering": {
    desc: "Experience the bold, fiery flavors of Andhra cuisine at your event. Our expert chefs prepare authentic Andhra meals featuring signature spices, traditional preparations, and both vegetarian and non-vegetarian specialties. From the famous Gongura chicken to the fiery Andhra chicken curry, every dish is a celebration of regional culinary heritage.",
    highlights: ["Authentic Andhra recipes", "Vegetarian & non-veg options", "Live dosa & curry counters", "Experienced service staff", "Fresh ingredients daily", "Customizable spice levels"],
    inclusions: ["Full buffet setup with chafing dishes", "Service staff (1 per 25 guests)", "Disposable plates and cutlery", "Welcome drink station", "2 starter, 4 main course, 2 dessert", "Pappu, sambar, rasam, curd"],
    exclusions: ["Premium cutlery and linen (extra)", "Alcohol and bar service", "Generator charges for outdoor"],
    customization: ["Add live biryani counter", "Add non-veg specialties (Gongura, Chepa)", "Upgrade to premium dessert spread", "Add welcome drink variety", "Include traditional banana leaf service"],
    occasions: ["Weddings", "Engagement Functions", "Birthday Functions", "Corporate Events"],
    faqs: [
      { question: "What is the minimum guest count?", answer: "We cater for events with a minimum of 50 guests. For smaller gatherings, please contact us for customized pricing." },
      { question: "Can you adjust spice levels?", answer: "Yes, we can customize spice levels from mild to authentic Andhra fiery. Please inform us of preferences when booking." },
      { question: "Do you provide serving staff?", answer: "Yes, we provide 1 trained service staff member per 25 guests as part of the package. Additional staff can be arranged." },
    ],
    packages: [
      { name: "Standard Menu", price: 650, description: "Per person - classic Andhra spread", features: ["2 starters", "4 main courses", "2 desserts", "Pappu, sambar, rasam", "Curd & pickle"] },
      { name: "Premium Menu", price: 850, description: "Per person - extended menu with live counter", features: ["3 starters", "6 main courses", "3 desserts", "Live dosa counter", "Welcome drink", "Premium dessert"] },
      { name: "Royal Feast", price: 1200, description: "Per person - luxury Andhra banquet", features: ["4 starters", "8 main courses", "4 desserts", "Live biryani counter", "Mocktail bar", "Banana leaf service"] },
    ],
    booking_info: "Minimum 50 guests. Book at least 5 days in advance. 50% advance to confirm. Per-person pricing based on menu selection.",
  },
  "South Indian Catering": {
    desc: "Fresh, authentic South Indian cuisine prepared with traditional recipes and the finest ingredients. From crispy dosas to fluffy idlis, aromatic biryanis to rich payasams, our menu celebrates the diverse culinary traditions of South India. Perfect for events that call for comforting, crowd-pleasing food.",
    highlights: ["Authentic South Indian recipes", "Breakfast, lunch & dinner menus", "Live dosa counter available", "Traditional banana leaf service", "Fresh ingredients daily", "Jain-friendly options"],
    inclusions: ["Full buffet setup", "Service staff (1 per 25 guests)", "Welcome drink (buttermilk/lassi)", "2 breakfast items, 4 lunch items, 2 dessert", "Sambar, chutney varieties", "Filter coffee station"],
    exclusions: ["Premium cutlery (extra)", "Non-vegetarian dishes (separate menu)", "Outdoor generator charges"],
    customization: ["Add live dosa counter", "Add non-veg South Indian dishes", "Upgrade to premium dessert spread", "Add traditional banana leaf service", "Include evening tiffin menu"],
    occasions: ["Weddings", "Upanayanam", "Housewarming", "Birthday Functions", "Religious Functions"],
    faqs: [
      { question: "Do you offer Jain-friendly meals?", answer: "Yes, we prepare Jain-friendly South Indian dishes without onion, garlic, and root vegetables upon request." },
      { question: "Can you serve food on banana leaves?", answer: "Yes, traditional banana leaf service is available as an add-on for an authentic dining experience." },
      { question: "Is breakfast catering available?", answer: "Yes, we offer complete breakfast menus including idli, vada, dosa, upma, pongal, and filter coffee." },
    ],
    packages: [
      { name: "Breakfast Menu", price: 450, description: "Per person - traditional South Indian breakfast", features: ["Idli, vada, dosa", "Sambar & 2 chutneys", "Upma or pongal", "Filter coffee", "Welcome drink"] },
      { name: "Lunch Menu", price: 550, description: "Per person - full South Indian lunch", features: ["Rice, 2 curries", "Sambar, rasam, curd", "2 appalam, pickle", "2 desserts (payasam)", "Welcome drink"] },
      { name: "Full Day Menu", price: 900, description: "Per person - breakfast + lunch + evening tiffin", features: ["Full breakfast spread", "Complete lunch menu", "Evening tiffin", "Live dosa counter", "Filter coffee all day"] },
    ],
    booking_info: "Minimum 50 guests. Book at least 4 days in advance. 50% advance to confirm.",
  },
  "Reception": {
    desc: "Transform your reception into an unforgettable evening of elegance and celebration. Our comprehensive reception decor package covers everything from stunning stage backdrops to ambient lighting, table centerpieces, and entrance archways. We create a cohesive visual theme that matches your style and leaves guests in awe.",
    highlights: ["Custom theme design", "Premium stage backdrop", "Ambient & mood lighting", "Table centerpieces included", "Entrance archway decor", "Flower arrangements throughout"],
    inclusions: ["Stage backdrop (15x20 ft)", "LED mood lighting", "Table centerpieces (up to 15 tables)", "Entrance flower archway", "Welcome board with couple names", "Draping and fabric decor"],
    exclusions: ["Furniture rental (chairs, tables)", "Sound system and DJ", "Catering equipment", "Venue booking"],
    customization: ["Add fairy light canopy", "Add live flower wall", "Upgrade to premium imported flowers", "Add dance floor LED panels", "Add cold sparkler fireworks"],
    occasions: ["Weddings", "Receptions", "Anniversary Functions"],
    faqs: [
      { question: "How early should we book?", answer: "We recommend booking at least 3-4 weeks in advance to ensure availability and allow time for theme customization and material procurement." },
      { question: "Do you handle teardown after the event?", answer: "Yes, our team handles complete setup and teardown. We typically begin teardown after the event concludes and complete it within 2-3 hours." },
      { question: "Can we see decor samples before booking?", answer: "Yes, we provide a portfolio of past events and can create a digital mockup of your reception decor before confirmation." },
    ],
    packages: [
      { name: "Classic Reception", price: 75000, description: "Elegant decor for a memorable evening", features: ["Stage backdrop (15x20 ft)", "LED mood lighting", "10 table centerpieces", "Entrance archway", "Welcome board"] },
      { name: "Grand Reception", price: 120000, description: "Premium decor with enhanced lighting", features: ["Larger stage (20x25 ft)", "Premium lighting design", "20 table centerpieces", "Flower wall backdrop", "Fairy light canopy", "Cold sparklers"] },
      { name: "Royal Reception", price: 200000, description: "Ultimate luxury decor experience", features: ["Grand stage (30x30 ft)", "Designer lighting throughout", "Unlimited centerpieces", "Imported flower arrangements", "LED dance floor", "Live flower installations"] },
    ],
    booking_info: "Book at least 3 weeks in advance. 40% advance to confirm. Final guest count needed 5 days before event.",
  },
  "Mehendi": {
    desc: "Create the perfect ambiance for your Mehendi ceremony with vibrant, festive decor that celebrates this beautiful tradition. From colorful drapes and marigold garlands to intricate henna stations and comfortable seating for guests, we handle every detail to make your Mehendi night joyful and memorable.",
    highlights: ["Vibrant Mehendi theme decor", "Marigold & rose garlands", "Comfortable henna seating", "Festive lighting design", "Custom henna station setup", "Matching color scheme"],
    inclusions: ["Mehendi stage setup (10x15 ft)", "Marigold and rose garlands", "Henna artist seating area (up to 10 chairs)", "Festive string lighting", "Color-coordinated draping", "Welcome sign"],
    exclusions: ["Mehendi artists (book separately)", "Catering", "Sound system", "Furniture rental beyond listed"],
    customization: ["Add live music setup", "Add swing/jhula decor", "Upgrade to premium flowers", "Add photo booth corner", "Add cushion seating area"],
    occasions: ["Weddings", "Mehendi Ceremonies", "Haldi Ceremonies"],
    faqs: [
      { question: "Do you provide Mehendi artists?", answer: "We focus on decor and setup. Mehendi artists can be arranged through our partner network upon request, or you can book your own." },
      { question: "How long does setup take?", answer: "Typical Mehendi decor setup takes 3-4 hours. We arrive early to ensure everything is ready before guests arrive." },
      { question: "Can we choose our color scheme?", answer: "Absolutely. We customize drapes, flowers, and lighting to match your preferred color palette and theme." },
    ],
    packages: [
      { name: "Essential Mehendi", price: 28000, description: "Festive decor for intimate gatherings", features: ["Stage setup (10x15 ft)", "Marigold garlands", "10 chairs with cushions", "String lighting", "Color draping"] },
      { name: "Premium Mehendi", price: 45000, description: "Enhanced decor with premium elements", features: ["Larger stage (15x20 ft)", "Premium flower arrangements", "Cushion seating lounge", "Fairy light canopy", "Henna station decor", "Photo corner"] },
      { name: "Royal Mehendi", price: 75000, description: "Lavish decor for grand celebrations", features: ["Grand stage (20x25 ft)", "Imported flowers", "Swing/jhula setup", "Full fairy light canopy", "Live music stage", "Luxury cushion lounge"] },
    ],
    booking_info: "Book at least 2 weeks in advance. 40% advance to confirm. Setup begins 4 hours before event start.",
  },
  "Stage Setup Workers": {
    desc: "Professional stage setup crew for events of any scale. Our experienced team handles everything from modular stage construction to backdrop installation, platform arrangement, and safety checks. We work efficiently to transform any venue into a polished event space, on time and to specification.",
    highlights: ["Experienced setup crew", "Modular stage construction", "Safety-checked platforms", "On-time delivery", "Backdrop installation", "Dismantle after event"],
    inclusions: ["4-6 setup crew members", "Modular stage platform (up to 20x15 ft)", "Backdrop frame installation", "Safety railings", "Stairs and ramps", "Dismantle and cleanup"],
    exclusions: ["Backdrop draping and decor", "Sound and lighting equipment", "Stage flooring/carpeting", "Generator power"],
    customization: ["Add extended crew for large stages", "Add stage carpeting", "Add riser platforms for seating", "Add rotating stage mechanism"],
    occasions: ["Weddings", "Corporate Events", "School & College Events", "Religious Functions"],
    faqs: [
      { question: "How large a stage can you set up?", answer: "We can construct stages up to 40x30 ft. For larger stages, please book in advance so we can arrange additional crew and materials." },
      { question: "Do you dismantle the stage after the event?", answer: "Yes, complete dismantle and site cleanup are included. Our team returns after the event to safely disassemble everything." },
      { question: "How early do you arrive for setup?", answer: "We arrive 6-8 hours before the event start time for standard stages. Larger stages may require a day-before setup." },
    ],
    packages: [
      { name: "Standard Stage", price: 2200, description: "Per day - up to 20x15 ft stage", features: ["4 crew members", "Stage up to 20x15 ft", "Backdrop frame", "Safety railings", "Dismantle included"] },
      { name: "Large Stage", price: 4500, description: "Per day - up to 30x20 ft stage", features: ["6 crew members", "Stage up to 30x20 ft", "Reinforced framework", "Stairs and ramps", "Dismantle included"] },
      { name: "Grand Stage", price: 8000, description: "Per day - up to 40x30 ft stage", features: ["8 crew members", "Stage up to 40x30 ft", "Multi-level platforms", "Heavy-duty framework", "Day-before setup option"] },
    ],
    booking_info: "Book at least 5 days in advance. Per-day pricing. Crew arrives 6-8 hours before event.",
  },
  "Corporate Events": {
    desc: "End-to-end corporate event production that delivers seamless, professional experiences. From product launches to annual conferences, we manage the full production pipeline including stage design, audiovisual setup, lighting, branding, and on-site coordination. Your brand deserves a flawless presentation.",
    highlights: ["Full event production", "Professional AV setup", "Brand integration throughout", "On-site coordination team", "Custom stage design", "Live streaming capability"],
    inclusions: ["Custom stage design and setup", "Professional PA sound system", "LED screens and projection", "Stage lighting design", "Branding and signage", "Event coordinator on-site"],
    exclusions: ["Venue booking", "Catering services", "Guest accommodation", "Performer/talent fees"],
    customization: ["Add multi-camera live streaming", "Add LED video wall", "Add Simultaneous interpretation", "Add premium seating arrangement", "Add post-event video production"],
    occasions: ["Corporate Events", "Product Launches", "Annual Conferences", "Award Ceremonies"],
    faqs: [
      { question: "Can you handle large-scale conferences?", answer: "Yes, we have produced events for 500+ attendees. Our team scales crew and equipment based on venue size and audience count." },
      { question: "Do you provide branding and stage design?", answer: "Yes, custom stage design, brand backdrops, signage, and LED screen content are all included in our production package." },
      { question: "Is live streaming available?", answer: "Yes, we offer professional multi-camera live streaming to YouTube, Zoom, or your preferred platform as an add-on service." },
    ],
    packages: [
      { name: "Standard Production", price: 65000, description: "Professional setup for up to 200 guests", features: ["Stage design & setup", "PA sound system", "Projection screen", "Stage lighting", "Branding signage", "1 coordinator"] },
      { name: "Premium Production", price: 120000, description: "Enhanced AV for up to 500 guests", features: ["Larger custom stage", "Line array sound", "LED screens", "Intelligent lighting", "Full branding package", "2 coordinators", "Live streaming setup"] },
      { name: "Enterprise Production", price: 250000, description: "Full-scale production for 500+ guests", features: ["Grand custom stage", "Premium line array", "LED video wall", "Moving head lights", "Complete branding", "Full coordination team", "Multi-camera live stream"] },
    ],
    booking_info: "Book at least 2 weeks in advance. 50% advance to confirm. Technical site visit included.",
  },
  "DJ Services": {
    desc: "Professional DJ services that keep your dance floor packed all night. Our experienced DJs blend Bollywood hits, regional favorites, EDM, and timeless classics to create the perfect party atmosphere. Complete with professional sound systems, dynamic lighting, and smoke effects for an unforgettable party experience.",
    highlights: ["Professional DJ with 5+ years experience", "Bollywood + regional + EDM mix", "Professional sound system", "Dynamic party lighting", "Smoke machine effects", "Requests welcome"],
    inclusions: ["1 professional DJ", "4-hour performance", "Dual speaker sound system (2000W)", "DJ booth and mixing console", "Party lighting (disco, laser, strobe)", "Smoke/fog machine"],
    exclusions: ["LED dance floor (extra)", "Additional speakers for large venues", "Live percussionist", "MC/host services"],
    customization: ["Add LED dance floor", "Add live dholak percussionist", "Upgrade to larger sound system", "Add MC/host", "Add cold sparkler fireworks"],
    occasions: ["Weddings", "Sangeet", "Birthday Functions", "Corporate Events", "School & College Events"],
    faqs: [
      { question: "Can we give the DJ a playlist?", answer: "Absolutely. Share your favorite songs and must-play tracks in advance. Our DJ will blend them seamlessly with crowd-pleasing mixes." },
      { question: "How large is the sound system?", answer: "Our standard system covers venues up to 500 guests. For larger events, we can upgrade to a line array system for an additional charge." },
      { question: "Do you take live requests?", answer: "Yes, our DJ welcomes guest requests and reads the crowd to keep the energy high throughout the event." },
    ],
    packages: [
      { name: "Party Set", price: 12000, description: "4-hour DJ performance for up to 200 guests", features: ["Professional DJ", "4-hour set", "2000W sound system", "Party lighting", "Smoke machine"] },
      { name: "Grand Party", price: 22000, description: "Enhanced setup for up to 500 guests", features: ["Premium DJ", "6-hour set", "4000W sound system", "Intelligent lighting", "Laser show", "LED uplighting"] },
      { name: "Mega Party", price: 35000, description: "Full club-grade experience", features: ["Star DJ", "Unlimited hours", "Line array sound", "Full intelligent lighting", "LED dance floor", "Cold sparklers", "Live dholak"] },
    ],
    booking_info: "Book at least 1 week in advance. 50% advance to confirm. DJ arrives 2 hours before for setup.",
  },
  "Security & Stewards": {
    desc: "Professional security and steward services to ensure your event runs smoothly and safely. Our trained personnel handle crowd management, access control, VIP protection, and guest assistance with professionalism and courtesy. Fully uniformed and experienced, our team adapts to events of any scale.",
    highlights: ["Trained, uniformed personnel", "Crowd management expertise", "VIP protection available", "Access control & wristbands", "Parking coordination", "Trained in emergency response"],
    inclusions: ["Uniformed security guards", "8-hour shift coverage", "Two-way radio communication", "High-visibility vests", "Crowd control barriers (if needed)", "Shift supervisor on-site"],
    exclusions: ["Armed security (requires special permit)", "Metal detectors and bag scanners", "K9 security units", "Fire safety equipment"],
    customization: ["Add VIP close protection", "Add female security personnel", "Add parking management team", "Add metal detector screening", "Increase to 24-hour coverage"],
    occasions: ["Weddings", "Corporate Events", "Concerts", "School & College Events", "Religious Functions"],
    faqs: [
      { question: "How many guards do we need?", answer: "We recommend 1 guard per 50 guests for general events, and 1 per 25 for high-security events. Our team can assess your venue and recommend the right number." },
      { question: "Are guards trained in emergency response?", answer: "Yes, all our personnel are trained in basic emergency response, evacuation procedures, and first aid. A shift supervisor coordinates all activities." },
      { question: "Can you provide female security personnel?", answer: "Yes, we can arrange trained female security personnel upon request, subject to availability. Please book in advance." },
    ],
    packages: [
      { name: "Basic Security", price: 1800, description: "Per guard per 8-hour shift", features: ["1 uniformed guard", "8-hour coverage", "Two-way radio", "High-vis vest", "Crowd management"] },
      { name: "Event Security Team", price: 15000, description: "8 guards + supervisor for full event", features: ["8 uniformed guards", "1 shift supervisor", "Full event coverage", "Radio communication set", "Crowd barriers"] },
      { name: "Premium Security", price: 30000, description: "Enhanced team with VIP protection", features: ["12 guards + 2 supervisors", "VIP close protection", "Metal detector screening", "Parking management", "24-hour coverage option"] },
    ],
    booking_info: "Book at least 3 days in advance. Per-guard or team pricing. Minimum 4-hour shift.",
  },
  "Tent / Canopy Workers": {
    desc: "Professional tent and canopy installation for outdoor events of any scale. Our experienced crew handles everything from site assessment and ground preparation to secure anchoring, sidewall installation, and decorative draping. We offer a range of tent sizes and styles to suit weddings, parties, and corporate gatherings.",
    highlights: ["Various tent sizes available", "Weather-resistant canopies", "Secure anchoring & safety", "Decorative draping options", "Sidewalls for weather protection", "Fast installation crew"],
    inclusions: ["4-6 installation crew", "Tent/canopy (up to 40x60 ft)", "Ground anchoring and weights", "Sidewalls (2-3 sides)", "Basic lighting strings", "Dismantle after event"],
    exclusions: ["Interior decor and furniture", "Flooring/carpeting", "Generator and power", "Climate control (AC/heaters)"],
    customization: ["Add transparent/starlight canopy", "Add flooring and carpeting", "Add decorative draping inside", "Add climate control units", "Add entrance archway tent"],
    occasions: ["Weddings", "Birthday Functions", "Corporate Events", "Religious Functions", "Housewarming"],
    faqs: [
      { question: "What size tents are available?", answer: "We offer tents from 10x10 ft for small gatherings to 40x60 ft for large events. Custom sizes can be arranged for special requirements." },
      { question: "Can tents withstand wind and rain?", answer: "Yes, our tents are weather-resistant with proper anchoring. Sidewalls can be installed for wind and rain protection. For severe weather, we recommend marquees." },
      { question: "How long does installation take?", answer: "Standard tents (up to 30x40 ft) take 2-3 hours. Larger installations may require 4-6 hours or a day-before setup." },
    ],
    packages: [
      { name: "Standard Canopy", price: 3000, description: "Per day - up to 20x30 ft tent", features: ["4 crew members", "Tent up to 20x30 ft", "Ground anchoring", "2 sidewalls", "String lighting", "Dismantle included"] },
      { name: "Large Tent", price: 6000, description: "Per day - up to 40x60 ft tent", features: ["6 crew members", "Tent up to 40x60 ft", "Heavy-duty anchoring", "4 sidewalls", "Interior string lights", "Dismantle included"] },
      { name: "Premium Marquee", price: 12000, description: "Per day - luxury tent with decor", features: ["8 crew members", "Premium tent up to 40x60 ft", "Decorative interior draping", "All sidewalls", "LED lighting", "Entrance archway"] },
    ],
    booking_info: "Book at least 5 days in advance. Per-day pricing. Setup crew arrives 4 hours before event.",
  },
};

function getContent(serviceType, category, title) {
  if (CONTENT[category]) {
    return { content: CONTENT[category], images: getImages(serviceType, category) };
  }

  if (serviceType === "camera_studio") {
    const img = category.includes("Drone") ? DRONE_IMAGES : CAMERA_IMAGES;
    return {
      content: {
        desc: `Professional ${title.toLowerCase()} services with experienced photographers and state-of-the-art equipment. We capture your special moments with artistic precision, delivering high-quality results that exceed expectations. Every project is handled with creativity and attention to detail.`,
        highlights: ["Professional equipment", "Experienced team", "High-quality delivery", "Quick turnaround", "Customizable packages", "Online gallery"],
        inclusions: ["Professional photographer(s)", "Edited high-resolution photos", "Online gallery", "Digital delivery", "Pre-event consultation"],
        exclusions: ["Travel outside city limits", "Printed albums (extra)", "Additional hours beyond package"],
        customization: ["Add extra hours", "Add drone coverage", "Add printed album", "Add same-day teaser", "Include raw footage"],
        occasions: ["Weddings", "Birthdays", "Corporate Events", "Engagement Functions"],
        faqs: [
          { question: "How soon will we receive the photos?", answer: "Edited photos are delivered within 10-15 days via an online gallery. Same-day teaser available on request." },
          { question: "Do you travel to outstation venues?", answer: "Yes, we travel to venues outside the city. Travel charges apply for locations beyond 50 km." },
          { question: "Can we request specific styles?", answer: "Absolutely. We discuss your preferences during the pre-event consultation and tailor our approach accordingly." },
        ],
        packages: [
          { name: "Basic", price: 12000, description: "Essential coverage", features: ["1 photographer", "4-hour coverage", "150+ edited photos", "Online gallery"] },
          { name: "Standard", price: 25000, description: "Extended coverage with album", features: ["2 photographers", "8-hour coverage", "300+ edited photos", "Premium album", "Teaser reel"] },
          { name: "Premium", price: 50000, description: "Full luxury experience", features: ["3 photographers", "Full-day coverage", "500+ edited photos", "Luxury album", "Drone coverage", "Cinematic teaser"] },
        ],
        booking_info: "Book at least 1 week in advance. 25% advance to confirm. Balance due on event day.",
      },
      images: img,
    };
  }

  if (serviceType === "catering") {
    let img;
    if (category.includes("Biryani")) img = BIRYANI_IMAGES;
    else if (category.includes("South Indian")) img = SOUTH_INDIAN_IMAGES;
    else img = CATERING_IMAGES;
    return {
      content: {
        desc: `Delicious ${title.toLowerCase()} prepared fresh by experienced chefs using quality ingredients. Our menu features a variety of dishes to suit every palate, with options for vegetarian and non-vegetarian preferences. Complete buffet setup and professional service included.`,
        highlights: ["Fresh ingredients daily", "Customizable menus", "Vegetarian & non-veg options", "Professional service staff", "Buffet setup included", "Hygiene certified"],
        inclusions: ["Full buffet setup with chafing dishes", "Service staff (1 per 25 guests)", "Welcome drink", "2 starters, 4 main courses, 2 desserts", "Plates and cutlery", "Pappu, sambar, rasam, curd"],
        exclusions: ["Premium cutlery and linen", "Alcohol and bar service", "Generator for outdoor"],
        customization: ["Add live food counter", "Add premium dishes", "Upgrade dessert spread", "Add welcome drink variety", "Include traditional service"],
        occasions: ["Weddings", "Birthday Functions", "Corporate Events", "Engagement Functions", "Housewarming"],
        faqs: [
          { question: "What is the minimum guest count?", answer: "We cater for minimum 50 guests. For smaller gatherings, contact us for customized pricing." },
          { question: "Can you accommodate dietary restrictions?", answer: "Yes, we offer Jain, vegan, and allergy-friendly options. Please inform us at the time of booking." },
          { question: "Do you provide tasting before booking?", answer: "Yes, a tasting session can be arranged for confirmed bookings with 100+ guests." },
        ],
        packages: [
          { name: "Standard Menu", price: 500, description: "Per person - classic spread", features: ["2 starters", "4 main courses", "2 desserts", "Sambar, rasam, curd", "Welcome drink"] },
          { name: "Premium Menu", price: 750, description: "Per person - extended menu", features: ["3 starters", "6 main courses", "3 desserts", "Live counter", "Premium dessert"] },
          { name: "Royal Menu", price: 1000, description: "Per person - luxury feast", features: ["4 starters", "8 main courses", "4 desserts", "Multiple live counters", "Mocktail bar"] },
        ],
        booking_info: "Minimum 50 guests. Book at least 5 days in advance. 50% advance to confirm.",
      },
      images: img,
    };
  }

  if (serviceType === "function") {
    return {
      content: {
        desc: `Complete ${title.toLowerCase()} package with professional decor, styling, and coordination. We transform your venue with elegant themes, beautiful flower arrangements, and attention to every detail. Our team ensures your celebration looks stunning and runs smoothly from start to finish.`,
        highlights: ["Custom theme design", "Professional decor team", "Flower arrangements", "Lighting design", "On-site coordination", "Setup and teardown included"],
        inclusions: ["Stage backdrop (10x15 ft)", "Flower arrangements", "Ambient lighting", "Entrance decor", "Welcome board", "Setup and teardown"],
        exclusions: ["Furniture rental", "Catering", "Sound system", "Venue booking"],
        customization: ["Add fairy light canopy", "Add premium flowers", "Add dance floor", "Add cold sparklers", "Add themed props"],
        occasions: ["Weddings", "Birthday Functions", "Corporate Events", "Engagement Functions", "Anniversary Functions"],
        faqs: [
          { question: "How early should we book?", answer: "We recommend booking at least 2-3 weeks in advance for proper planning and material procurement." },
          { question: "Can we customize the theme?", answer: "Yes, we create custom themes based on your preferences, color scheme, and event type. A digital mockup can be provided." },
          { question: "Do you handle teardown?", answer: "Yes, complete setup and teardown are included. Our team returns after the event to disassemble everything." },
        ],
        packages: [
          { name: "Essential", price: 18000, description: "Beautiful decor for intimate events", features: ["Stage (10x15 ft)", "Flower arrangements", "Ambient lighting", "Entrance decor"] },
          { name: "Premium", price: 35000, description: "Enhanced decor with premium elements", features: ["Larger stage (15x20 ft)", "Premium flowers", "Fairy light canopy", "Welcome board", "Photo corner"] },
          { name: "Royal", price: 65000, description: "Luxury decor experience", features: ["Grand stage (20x25 ft)", "Imported flowers", "Full lighting design", "LED dance floor", "Cold sparklers"] },
        ],
        booking_info: "Book at least 2 weeks in advance. 40% advance to confirm. Setup begins 4-6 hours before event.",
      },
      images: FUNCTION_IMAGES,
    };
  }

  if (serviceType === "workers") {
    let img;
    if (category.includes("Flower")) img = FLOWER_IMAGES;
    else if (category.includes("Security")) img = SECURITY_IMAGES;
    else if (category.includes("Tent")) img = TENT_IMAGES;
    else if (category.includes("DJ")) img = WORKERS_IMAGES;
    else img = WORKERS_IMAGES;
    return {
      content: {
        desc: `Professional ${title.toLowerCase()} team with experienced personnel and proper equipment. Our crew is reliable, efficient, and trained to handle events of any scale. We arrive on time, work systematically, and ensure complete setup to your specifications.`,
        highlights: ["Experienced crew", "Proper tools and equipment", "On-time arrival", "Safety-conscious", "Flexible scheduling", "Cleanup included"],
        inclusions: ["4-6 team members", "8-hour work shift", "Basic tools and equipment", "Safety gear", "Setup and dismantle", "Site cleanup"],
        exclusions: ["Specialized equipment rental", "Materials and supplies", "Generator power", "Transport of materials"],
        customization: ["Add more crew members", "Extend work hours", "Add specialized equipment", "Add material procurement", "Multi-day projects"],
        occasions: ["Weddings", "Corporate Events", "Birthday Functions", "School & College Events", "Religious Functions"],
        faqs: [
          { question: "How many workers do we need?", answer: "For standard setups, 4-6 workers suffice. For larger events or complex setups, we can scale the team size. We assess requirements during consultation." },
          { question: "Do workers bring their own tools?", answer: "Yes, our crew brings standard tools and safety equipment. Specialized equipment can be arranged at additional cost." },
          { question: "What are the working hours?", answer: "Standard shift is 8 hours. Overtime applies beyond that. For early setups, we can arrange early or overnight shifts." },
        ],
        packages: [
          { name: "Basic Crew", price: 1500, description: "Per day - 4 workers for 8 hours", features: ["4 workers", "8-hour shift", "Basic tools", "Safety gear", "Cleanup"] },
          { name: "Standard Crew", price: 2800, description: "Per day - 6 workers for 8 hours", features: ["6 workers", "8-hour shift", "Extended tools", "Safety gear", "Supervisor on-site"] },
          { name: "Large Crew", price: 5000, description: "Per day - 10 workers for 8 hours", features: ["10 workers", "8-hour shift", "Full equipment set", "Shift supervisor", "Priority scheduling"] },
        ],
        booking_info: "Book at least 3 days in advance. Per-day pricing. Crew arrives at agreed time with tools.",
      },
      images: img,
    };
  }

  return {
    content: {
      desc: `Professional ${title.toLowerCase()} service with experienced team and quality results. Contact us for customization options and package details.`,
      highlights: ["Professional service", "Experienced team", "Quality assured", "Flexible packages"],
      inclusions: ["Professional team", "Standard equipment", "8-hour service"],
      exclusions: ["Specialized equipment", "Materials"],
      customization: ["Extended hours", "Additional crew", "Custom requirements"],
      occasions: ["Weddings", "Corporate Events", "Birthday Functions"],
      faqs: [{ question: "How to book?", answer: "Select a package and proceed to booking. You can customize during the booking process." }],
      packages: [{ name: "Basic", price: 2000, description: "Standard service", features: ["Professional team", "8-hour service", "Standard equipment"] }],
      booking_info: "Book at least 3 days in advance. 50% advance to confirm.",
    },
    images: CAMERA_IMAGES,
  };
}

function getImages(serviceType, category) {
  if (CONTENT[category]) {
    if (category.includes("Drone")) return DRONE_IMAGES;
    if (category.includes("Biryani")) return BIRYANI_IMAGES;
    if (category.includes("South Indian")) return SOUTH_INDIAN_IMAGES;
    if (category.includes("Mehendi")) return MEHENDI_IMAGES;
    if (category.includes("Birthday") && serviceType === "function") return BIRTHDAY_IMAGES;
    if (category.includes("Flower")) return FLOWER_IMAGES;
    if (category.includes("Security")) return SECURITY_IMAGES;
    if (category.includes("Tent")) return TENT_IMAGES;
    if (serviceType === "camera_studio") return CAMERA_IMAGES;
    if (serviceType === "catering") return CATERING_IMAGES;
    if (serviceType === "function") return FUNCTION_IMAGES;
    if (serviceType === "workers") return WORKERS_IMAGES;
  }
  const { images } = getContent(serviceType, category, "");
  return images;
}

const services = [
  { id: "7f93ebfb-e2e0-478a-9c53-dce4e4aea722", title: "Birthday & Function Photography", service_type: "camera_studio", category: "Birthday & Function Photography" },
  { id: "2fb08507-c357-4825-8250-bba63a9fe713", title: "Drone Event Coverage", service_type: "camera_studio", category: "Drone Photography & Videography" },
  { id: "2d11c821-93e8-4f5d-b7ef-1c7dcb0f6da7", title: "Engagement & Reception Coverage", service_type: "camera_studio", category: "Engagement & Reception Photography" },
  { id: "a9ac30be-80a0-4e50-8cc2-eaedae8e64fd", title: "Live Event Streaming", service_type: "camera_studio", category: "Live Streaming" },
  { id: "1e8352f4-cc5d-480a-8dfb-4af56e491872", title: "Photo & Video Editing Studio", service_type: "camera_studio", category: "Photo & Video Editing" },
  { id: "2bf80752-615b-4d96-969d-0895cb26ea3b", title: "Pre-Wedding Story Session", service_type: "camera_studio", category: "Pre-Wedding Shoot" },
  { id: "dcb1eaa0-4722-4844-a97f-b84ced43fac7", title: "Traditional Wedding Photography", service_type: "camera_studio", category: "Traditional Photography" },
  { id: "1ea91c67-66ae-404a-a3f7-be700e2833f3", title: "Royal Wedding Photography", service_type: "camera_studio", category: "Wedding Photography" },
  { id: "8cfc5a49-3e02-4927-91e1-b0111260a725", title: "Camera Studio Service", service_type: "camera_studio", category: "Wedding Photography" },
  { id: "bdd50b53-0112-4bb7-b4e9-cb5b6ea66850", title: "Cinematic Wedding Films", service_type: "camera_studio", category: "Wedding Videography" },
  { id: "72e80656-d3e2-4a6c-8fd0-009f583b7088", title: "Gsvs", service_type: "catering", category: "Andhra Catering" },
  { id: "b24872d5-f650-4f93-b222-feedca630488", title: "Andhra Wedding Feast", service_type: "catering", category: "Andhra Catering" },
  { id: "d37141c0-1aa6-4a61-9ccd-d557691f096a", title: "Birthday Party Catering", service_type: "catering", category: "Birthday Catering" },
  { id: "68e35b00-3ecd-4f5d-a965-503e8479061d", title: "Signature Biryani Catering", service_type: "catering", category: "Biryani Catering" },
  { id: "5bd6eabf-ba4d-4c4e-b35f-a8922f6e676a", title: "Corporate Lunch Catering", service_type: "catering", category: "Corporate Catering" },
  { id: "4c2aa113-7e3a-42cc-ba60-fad1e4dc3f21", title: "Catering Service", service_type: "catering", category: "Function Catering" },
  { id: "ac6129a0-2131-4a72-ad23-fcdc58840649", title: "Function Catering Signature Menu", service_type: "catering", category: "Function Catering" },
  { id: "a7c3d017-2126-467a-834d-6fd79701567e", title: "Non-Vegetarian Banquet Menu", service_type: "catering", category: "Non-Vegetarian Catering" },
  { id: "5236e381-74bf-4d61-a666-0f6a90c8da70", title: "South Indian Celebration Menu", service_type: "catering", category: "South Indian Catering" },
  { id: "425df6ad-7e31-42b8-aadf-138b467ca55e", title: "Traditional Andhra Feast", service_type: "catering", category: "Traditional Catering" },
  { id: "1322c04c-6921-4254-b9c7-15394cc196b7", title: "Vegetarian Celebration Menu", service_type: "catering", category: "Vegetarian Catering" },
  { id: "94675fb9-ceed-4e5f-84ba-8803935a5476", title: "Wedding Catering Grand Menu", service_type: "catering", category: "Wedding Catering" },
  { id: "eb620a5e-844c-48f1-bf80-48742f1d2a6b", title: "Anniversary Celebration Design", service_type: "function", category: "Anniversary Functions" },
  { id: "2657cd9f-fc67-41ab-a738-8e2b1c6f9079", title: "Baby Shower Decor", service_type: "function", category: "Baby Shower" },
  { id: "d54e605c-d2c8-4e89-9622-c7878341afcb", title: "Birthday Party Styling", service_type: "function", category: "Birthday Functions" },
  { id: "8a84d515-a36d-431f-a24a-cb578d43c63c", title: "Corporate Event Production", service_type: "function", category: "Corporate Events" },
  { id: "5d924ed2-1ece-4772-991d-2901e991892d", title: "Engagement Celebration Package", service_type: "function", category: "Engagement Functions" },
  { id: "d4ca2f2a-d1eb-4385-811f-37a24a507992", title: "Housewarming Event Setup", service_type: "function", category: "Housewarming" },
  { id: "d650bd51-6c4e-4e8c-8c2a-3861098eedba", title: "Mehendi Night Styling", service_type: "function", category: "Mehendi" },
  { id: "b3149ef3-4a3e-4314-b4a3-4747651fb808", title: "Naming Ceremony Styling", service_type: "function", category: "Naming Ceremony" },
  { id: "eb729973-bf25-4054-b449-e8af627645a9", title: "Elegant Reception Decor", service_type: "function", category: "Reception" },
  { id: "ed1762e8-0778-430a-94d5-a4ab3fc81ea9", title: "Traditional Religious Ceremony Setup", service_type: "function", category: "Religious Functions" },
  { id: "e7b831ba-9b00-430f-b278-4683ff7af344", title: "Sangeet Night Production", service_type: "function", category: "Sangeet" },
  { id: "cc664f10-6bd8-46ba-b3a7-08d18cb2a670", title: "School & College Event Setup", service_type: "function", category: "School & College Events" },
  { id: "169f8e0a-a65b-411a-8337-eb3153f2449c", title: "Wedding Planning & Coordination", service_type: "function", category: "Weddings" },
  { id: "1493cefe-669b-4d95-8b4f-20cabe2727a9", title: "Function Service", service_type: "function", category: "Weddings" },
  { id: "26adb558-27c5-4074-927f-da1493137250", title: "Professional Decoration Crew", service_type: "workers", category: "Decoration Workers" },
  { id: "e304a926-c9e8-4a2f-b6f4-c8c02b9caaf4", title: "Event DJ Services", service_type: "workers", category: "DJ Services" },
  { id: "b177c380-ab40-4698-af83-49ef6c669ab3", title: "Event Management Staff", service_type: "workers", category: "Event Management Staff" },
  { id: "e150c5a6-b439-4452-ba30-0e980d65bfff", title: "Worker Service", service_type: "workers", category: "Event Management Staff" },
  { id: "a8c715a9-ccc4-4361-bf66-8e29d8be8672", title: "Flower Decoration Team", service_type: "workers", category: "Flower Decoration Workers" },
  { id: "0f31bbae-9f26-48cf-9402-96de4a16829f", title: "Event Lighting Crew", service_type: "workers", category: "Lighting Workers" },
  { id: "ef3275e0-91ba-4b49-a851-a98e13097066", title: "Event Security & Stewards", service_type: "workers", category: "Security & Stewards" },
  { id: "17c5a09e-94c4-4281-bf44-a34550e63bf5", title: "Sound System Technicians", service_type: "workers", category: "Sound System Workers" },
  { id: "f3fb8094-2577-4e88-95a8-42e74fbc0e2f", title: "Stage Setup Crew", service_type: "workers", category: "Stage Setup Workers" },
  { id: "660bf95a-a96a-4101-8d0c-349f5686b49b", title: "Event Setup Crew", service_type: "workers", category: "Tables & Chairs Setup" },
  { id: "7bb4a998-1909-44c1-a3c2-7edcb0965a9f", title: "Tent & Canopy Installation", service_type: "workers", category: "Tent / Canopy Workers" },
];

function esc(s) {
  return String(s).replace(/'/g, "''");
}

const sqlParts = [];

for (const s of services) {
  const { content: c, images: imgPool } = getContent(s.service_type, s.category, s.title);
  const gallery = imgPool.slice(0, 9);

  const descEsc = esc(c.desc);
  const highlights = c.highlights.map(esc).join("','");
  const inclusions = c.inclusions.map(esc).join("','");
  const exclusions = c.exclusions.map(esc).join("','");
  const customization = c.customization.map(esc).join("','");
  const occasions = c.occasions.map(esc).join("','");
  const bookingInfo = esc(c.booking_info);
  const galleryStr = gallery.map(esc).join("','");
  const faqsJson = esc(JSON.stringify(c.faqs));
  const pkgsJson = esc(JSON.stringify(c.packages));

  const sql = `UPDATE services SET
  description = '${descEsc}',
  gallery_urls = ARRAY['${galleryStr}'],
  highlights = ARRAY['${highlights}'],
  inclusions = ARRAY['${inclusions}'],
  exclusions = ARRAY['${exclusions}'],
  customization_options = ARRAY['${customization}'],
  suitable_occasions = ARRAY['${occasions}'],
  faqs = '${faqsJson}'::jsonb,
  packages = '${pkgsJson}'::jsonb,
  booking_info = '${bookingInfo}'
WHERE id = '${s.id}';`;

  sqlParts.push(sql);
}

const fullSql = sqlParts.join("\n\n");

const outputFile = process.argv[2] || "backfill_output.sql";
fs.writeFileSync(outputFile, fullSql, "utf8");
console.log(`Generated ${sqlParts.length} UPDATE statements -> ${outputFile}`);
