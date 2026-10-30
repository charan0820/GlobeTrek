import React from "react";
import { useQuery } from "@tanstack/react-query";
export default function DestinationPhoto({ country }) {
  const { data } = useQuery({
    queryKey: ["image-attribution"],
    queryFn: ({ signal }) =>
      fetch("/destinations/attribution.json", { signal }).then((r) => {
        if (!r.ok) throw Error("Attribution unavailable");
        return r.json();
      }),
    staleTime: Infinity,
    retry: false,
  });
  const image = data?.find((i) => i.country === country);
  if (!image) return null;
  return (
    <figure className="destination-photo">
      <img
        src={image.file}
        alt={image.title.replace(/^File:/, "").replace(/\.[a-z]+$/i, "")}
        width={1200}
        height={800}
        loading="lazy"
      />
      <figcaption>
        Destination photograph · not a demo property.{" "}
        <a href={image.source} target="_blank" rel="noreferrer">
          {image.creator}
        </a>{" "}
        ·{" "}
        <a href={image.licenseUrl} target="_blank" rel="noreferrer">
          {image.license}
        </a>
      </figcaption>
    </figure>
  );
}
