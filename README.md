**Try it:** [devil-bites.vercel.app](https://devil-bites.vercel.app) · **Read the story:** [How we built it](https://devil-bites.vercel.app/story.html)

# Devil Bites: Why Your Protein Bar Costs $2 More Across Campus

November 15, 2026

Devil Bites is a free web app that helps Duke students find the cheapest snacks and drinks on campus and manage their food points throughout the semester.

## Where the idea came from

One day, I bought a Barebells protein bar at the Wilson café for $5.68. Later that week, I found the exact same protein bar in a vending machine for $3.25. I was surprised that there could be such a big price difference for the same product on the same campus.

I started wondering how many other snacks I was overpaying for without realizing it. If I bought three of those protein bars a week at Wilson instead of a vending machine, I would be spending over $100 more each semester just on protein bars.

There wasn’t really an easy way to compare prices across campus, so I decided to build one.

## Looking at prices across Duke

I walked around campus and manually collected over 300 prices from vending machines, the Lobby Shop, Bella Union, the Wilson café, and several other locations.

I found a few interesting things:

- 27 items had price differences of up to 75% depending on where they were purchased.
- No single location was consistently the cheapest. Vending machines had cheaper Barebells, while the Lobby Shop had cheaper Bubbl’r and Gatorade.
- Taxes also varied by location. Vending machines had no additional tax, the Lobby Shop and Bella Union added 2%, and the Wilson café added 7.45%.

Even if students wanted to save food points, it would be difficult to remember which location had the best price for every product, especially when factoring in taxes.

## What Devil Bites does

### Comparing prices across campus

Students can search for a snack or drink and see which locations sell it, how much it costs after tax, and where they can get it for the lowest price.

I also wanted the app to be useful when students don’t have a specific product in mind. For example, if you’re looking for an energy drink before an exam or trying to get more protein without spending too many food points, you can use the nutritional filters to compare your options.

Some additional features include:

- Sorting products by price or walking distance.
- Finding products with the biggest price differences across campus.
- Comparing caffeine content and protein per dollar.
- Filtering for lower-calorie snacks and drinks.
- Saving frequently purchased items for easy access.

### Managing food points

Another problem I noticed was how difficult it can be to figure out whether you’re spending your food points too quickly. It’s especially hard to account for breaks, weekends, and days when you’re not eating on campus.

I built a feature called My Pace, where students can select their meal plan and enter their current food point balance. The app calculates how much they should have left at that point in the semester, whether they’re ahead or behind, and how much they can spend each day moving forward.

Students can also mark days when they’ll be away from campus, such as Thanksgiving break, and their budget will adjust accordingly. The calculations account for differences between meal plans, including plans that only charge on weekdays.

## Why I wanted to combine these features

There are already tools that help Duke students track their food points or locate vending machines, but I wanted to connect those two ideas.

Knowing that you’re behind on food points is helpful, but knowing where you can buy the things you already purchase for less makes it easier to actually change your spending habits. My goal was to give students both pieces of information in one place without requiring them to drastically change what they eat or drink.

## How I built it

I built Devil Bites using HTML, CSS, and JavaScript and hosted it on GitHub Pages. All of the pricing data is stored in a spreadsheet, which makes it easier to update prices without having to change the code every time.

I wanted to make the app as accessible as possible, so there is no sign-up process or account required. The app doesn’t collect personal information or food point balances, and students can add it directly to their phone’s home screen.

## What I learned

Going into this project, I expected the coding to be the most time-consuming part. However, collecting and organizing the data ended up being one of the biggest challenges. Prices varied by location, products were listed under different names, and taxes made comparisons more complicated than I initially expected.

I also spent a lot of time thinking about how to present the information in a way that students would actually find useful. Having a spreadsheet with over 300 prices is great, but most students aren’t going to look through it every time they want a snack. I wanted to make that information accessible within a few seconds.

One of my favorite parts of building Devil Bites was taking a small frustration from my own experience at Duke and turning it into something that could hopefully help other students.

## Try Devil Bites

Devil Bites is free and available at [https://devil-bites.vercel.app/](https://devil-bites.vercel.app/).
