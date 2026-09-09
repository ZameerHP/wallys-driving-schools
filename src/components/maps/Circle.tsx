import {
  forwardRef,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef
} from 'react';
import type { Ref } from 'react';
import { GoogleMapsContext, latLngEquals } from '@vis.gl/react-google-maps';

export type CircleEventProps = {
  onClick?: (e: google.maps.MapMouseEvent) => void;
  onDrag?: (e: google.maps.MapMouseEvent) => void;
  onDragStart?: (e: google.maps.MapMouseEvent) => void;
  onDragEnd?: (e: google.maps.MapMouseEvent) => void;
  onRadiusChanged?: (r: ReturnType<google.maps.Circle['getRadius']>) => void;
  onCenterChanged?: (p: ReturnType<google.maps.Circle['getCenter']>) => void;
};

export type CircleProps = google.maps.CircleOptions & CircleEventProps;
export type CircleRef = Ref<google.maps.Circle | null>;

function useCircle(props: CircleProps) {
  const {
    onClick,
    onDrag,
    onDragStart,
    onDragEnd,
    onRadiusChanged,
    onCenterChanged,
    radius,
    center,
    ...circleOptions
  } = props;

  const callbacks = useRef<Record<string, (e: unknown) => void>>({});
  Object.assign(callbacks.current, {
    onClick,
    onDrag,
    onDragStart,
    onDragEnd,
    onRadiusChanged,
    onCenterChanged
  });

  const circleRef = useRef<google.maps.Circle | null>(null);

  if (!circleRef.current && typeof window !== 'undefined' && window.google?.maps?.Circle) {
    circleRef.current = new window.google.maps.Circle();
  }

  const map = useContext(GoogleMapsContext)?.map;

  // Initialize or update options
  useEffect(() => {
    if (!circleRef.current) {
      if (typeof window !== 'undefined' && window.google?.maps?.Circle) {
        circleRef.current = new window.google.maps.Circle();
      }
    }
    if (circleRef.current) {
      circleRef.current.setOptions(circleOptions);
    }
  }, [circleOptions]);

  // Update center
  useEffect(() => {
    if (!circleRef.current || !center) return;
    const currentCenter = circleRef.current.getCenter();
    if (!currentCenter || !latLngEquals(center, currentCenter)) {
      circleRef.current.setCenter(center);
    }
  }, [center]);

  // Update radius
  useEffect(() => {
    if (!circleRef.current || radius === undefined || radius === null) return;
    if (radius !== circleRef.current.getRadius()) {
      circleRef.current.setRadius(radius);
    }
  }, [radius]);

  // Attach to map
  useEffect(() => {
    if (!map || !circleRef.current) return;
    circleRef.current.setMap(map);

    return () => {
      if (circleRef.current) {
        circleRef.current.setMap(null);
      }
    };
  }, [map]);

  // Attach event listeners
  useEffect(() => {
    const circle = circleRef.current;
    if (!circle || typeof window === 'undefined' || !window.google?.maps?.event) return;

    const gme = window.google.maps.event;
    const listeners: google.maps.MapsEventListener[] = [];

    listeners.push(
      gme.addListener(circle, 'click', (e: google.maps.MapMouseEvent) => {
        callbacks.current.onClick?.(e);
      })
    );
    listeners.push(
      gme.addListener(circle, 'radius_changed', () => {
        const newRadius = circle.getRadius();
        callbacks.current.onRadiusChanged?.(newRadius);
      })
    );
    listeners.push(
      gme.addListener(circle, 'center_changed', () => {
        const newCenter = circle.getCenter();
        callbacks.current.onCenterChanged?.(newCenter);
      })
    );

    return () => {
      listeners.forEach((listener) => gme.removeListener(listener));
    };
  }, []);

  return circleRef.current;
}

export const Circle = forwardRef<google.maps.Circle | null, CircleProps>((props, ref) => {
  const circle = useCircle(props);
  useImperativeHandle(ref, () => circle);
  return null;
});

Circle.displayName = 'Circle';
