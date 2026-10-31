import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ImageOff, X } from "lucide-react";
import { Modal } from "./ui.jsx";
import { placeId } from "./geo/presentation.js";
import { Price } from "./pricing.jsx";

export function useNarrow() {
  const [narrow, setNarrow] = useState(
    () => matchMedia("(max-width: 759px)").matches,
  );
  useEffect(() => {
    const media = matchMedia("(max-width: 759px)");
    const update = () => setNarrow(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return narrow;
}
export function usePlaceMedia() {
  return useQuery({
    queryKey: ["place-media-v1"],
    queryFn: async ({ signal }) => {
      const response = await fetch("/destinations/places.json", { signal });
      if (!response.ok) throw Error("Photographs unavailable");
      return response.json();
    },
    staleTime: Infinity,
    retry: false,
  });
}
export function PlacePhoto({ record, compact = false }) {
  const { data } = usePlaceMedia();
  const [failed, setFailed] = useState(null);
  const exact = data?.images?.find((image) => image.id === placeId(record));
  const image =
    exact ||
    data?.images?.find(
      (image) => image.cityId === (record.cityId || record.days?.[0]?.cityId),
    ) ||
    data?.images?.find((image) => image.country === record.country);
  const representative = !exact || record.demo;
  if (!image || failed === image.id)
    return (
      <div className={`place-photo photo-fallback ${compact ? "compact" : ""}`}>
        <ImageOff size={24} />
        <span>Photograph unavailable</span>
      </div>
    );
  const Tag = compact ? "span" : "figure";
  return (
    <Tag className={`place-photo ${compact ? "compact" : ""}`}>
      <img
        src={compact ? image.thumbnail : image.file}
        alt={
          representative
            ? `${image.alt} — representative destination imagery`
            : image.alt
        }
        width={image.width}
        height={image.height}
        loading="lazy"
        onError={() => setFailed(image.id)}
      />
      {!compact && (
        <figcaption>
          {representative && (
            <span>
              Representative destination photo — not this demo{" "}
              {record.roomTypes ? "property" : "product"}.{" "}
            </span>
          )}
          <a
            href={image.source}
            title={image.title}
            target="_blank"
            rel="noreferrer"
          >
            {image.creator}
          </a>{" "}
          ·{" "}
          <a href={image.licenseUrl} target="_blank" rel="noreferrer">
            {image.license}
          </a>
          <details>
            <summary>Photo attribution</summary>
            {image.title}. {image.modifications}
          </details>
        </figcaption>
      )}
    </Tag>
  );
}
export function Duration({ record, kind }) {
  if (!record.durationMinutes) return null;
  return (
    <span>
      {kind === "tours" || record.stopKind === "tour" || record.localStart
        ? "Tour duration"
        : "Suggested visit"}
      : {record.durationMinutes} min
    </span>
  );
}
export function PlaceSummary({ record, kind }) {
  return (
    <>
      <p className="place-city">
        {record.city || record.coveredCities || record.country}
        {record.demo ? " · Demo" : ""}
      </p>
      <h3>{record.name}</h3>
      <Price record={record} kind={kind} />
      <p>{record.description}</p>
      <p className="place-meta">
        <Duration record={record} kind={kind} />
      </p>
      {record.durationMinutes && (
        <p className="fine-print">
          {kind === "tours" || record.localStart
            ? "Scheduled time is shown in the destination timezone."
            : "Planning estimate; excludes travel, queues and breaks."}
        </p>
      )}
      {record.source && (
        <a href={record.source} target="_blank" rel="noreferrer">
          Destination information
        </a>
      )}
    </>
  );
}
export function PlacePreview({
  record,
  trigger,
  kind,
  onClose,
  onShowList,
  onAdd,
  addLabel,
  addDisabled = false,
  children,
}) {
  const location = useLocation();
  const detailParams = new URLSearchParams(location.search);
  detailParams.set("kind", kind);
  if (record) detailParams.set("item", placeId(record));
  const narrow = useNarrow();
  const identity = record?.occurrenceId || record?.id || record?._id;
  const closeRef = useRef(null),
    returnFocus = useRef(null);
  useEffect(() => {
    if (!identity) return;
    returnFocus.current = trigger || document.activeElement;
  }, [identity, trigger]);
  function restoreFocus() {
    requestAnimationFrame(() => {
      const origin = returnFocus.current;
      const target =
        origin?.isConnected && origin.getClientRects().length
          ? origin
          : [
              ...document.querySelectorAll(
                ".place-row.is-selected .text-button, .stop-row.is-selected .stop-title, .map-marker.selected",
              ),
            ].find((element) => element.getClientRects().length) ||
            document.getElementById("main");
      target?.focus({ preventScroll: true });
    });
  }
  useEffect(() => () => restoreFocus(), []);
  useEffect(() => {
    if (!record || narrow) return;
    const escape = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [record, narrow, onClose]);
  if (!record) return null;
  const content = (
    <>
      <PlacePhoto record={record} />
      <div className="preview-copy">
        <PlaceSummary record={record} kind={kind} />
        <div className="preview-actions">
          <Link
            onClick={(event) => {
              if (
                event.button === 0 &&
                !event.ctrlKey &&
                !event.metaKey &&
                !event.shiftKey &&
                !event.altKey
              )
                onClose();
            }}
            to={
              location.pathname.startsWith("/countries/")
                ? `${location.pathname}?${detailParams}`
                : `/discover/${kind}/${placeId(record)}`
            }
          >
            View full details
          </Link>
          {onShowList && (
            <button className="text-button" onClick={onShowList}>
              Show in list
            </button>
          )}
          {onAdd && (
            <button className="button" onClick={onAdd} disabled={addDisabled}>
              {addLabel}
            </button>
          )}
        </div>
        {onAdd && addDisabled && (
          <p className="fine-print">
            This selection cannot be added: check the day’s stop limit, lodging
            limit and trip dates.
          </p>
        )}
        {children}
      </div>
    </>
  );
  if (narrow)
    return (
      <Modal
        open
        title={record.name}
        description="Place photograph, information and planning actions."
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          restoreFocus();
        }}
        variant="place-sheet"
      >
        {content}
      </Modal>
    );
  return (
    <aside className="place-preview" aria-label={`${record.name} preview`}>
      <button
        ref={closeRef}
        className="icon-button preview-close"
        onClick={onClose}
        aria-label="Close place preview"
      >
        <X size={18} />
      </button>
      {content}
    </aside>
  );
}
