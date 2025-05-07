import React from "react";
import { Link } from "wouter";

export default function About() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-primary">
          About <span className="text-accent">Potomac Eels</span>
        </h1>
        
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-primary">Our Story</h2>
          <p className="mb-4 text-neutral-dark">
            Potomac Eels was established in 2020 with a simple mission: to serve the finest American 
            eels from the Potomac River, prepared in six delicious ways and delivered right to your door.
          </p>
          <p className="mb-4 text-neutral-dark">
            Our founder, a culinary expert with a passion for sustainable seafood, noticed that despite 
            the rich abundance of American eels in the Potomac River, few restaurants were showcasing 
            this versatile and flavorful delicacy. Thus, Potomac Eels was born.
          </p>
          <p className="mb-4 text-neutral-dark">
            Today, we pride ourselves on our commitment to sustainable fishing practices, supporting 
            local fishermen, and bringing the unique taste of expertly prepared eel dishes to homes 
            across Washington, DC and the surrounding areas.
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-primary">Our Six Signature Preparations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-xl font-medium mb-2 text-secondary">Smoked Eel</h3>
              <p className="text-neutral-dark">
                Our classic smoked eel is cured with a proprietary blend of spices before being slowly 
                smoked over hickory wood, resulting in a delicate, flavorful experience.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-medium mb-2 text-secondary">Grilled Eel</h3>
              <p className="text-neutral-dark">
                Simply seasoned and grilled to perfection, our grilled eel showcases the natural 
                richness of this remarkable fish.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-medium mb-2 text-secondary">Fried Eel</h3>
              <p className="text-neutral-dark">
                Crispy on the outside, tender on the inside, our fried eel is a customer favorite, 
                served with our signature dipping sauce.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-medium mb-2 text-secondary">Baked Eel</h3>
              <p className="text-neutral-dark">
                Slow-baked with herbs and seasonal vegetables, our baked eel offers a comforting, 
                homestyle approach to this distinctive ingredient.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-medium mb-2 text-secondary">Eel Sushi</h3>
              <p className="text-neutral-dark">
                Our take on the Japanese classic, featuring freshly prepared eel with cucumber and 
                avocado for a refreshing combination of flavors.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-medium mb-2 text-secondary">Stewed Eel</h3>
              <p className="text-neutral-dark">
                A hearty, warming dish that combines tender eel with aromatic herbs and vegetables in 
                a rich, flavorful broth.
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold mb-4 text-primary">Sustainability Commitment</h2>
          <p className="mb-4 text-neutral-dark">
            At Potomac Eels, sustainability isn't just a buzzword—it's central to everything we do. 
            We work exclusively with licensed fishermen who follow responsible harvesting practices to 
            ensure the continued health of the eel population in the Potomac River.
          </p>
          <p className="mb-4 text-neutral-dark">
            Our packaging is made from recycled and biodegradable materials, and we're constantly 
            looking for ways to reduce our environmental footprint throughout our operations.
          </p>
          <div className="mt-6">
            <Link href="/" className="inline-block bg-secondary hover:bg-secondary-light text-white px-6 py-2 rounded-md transition">
              Order Now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}