import React, { useEffect, useRef, useState } from 'react';
import { Modal, ScrollView, View } from 'react-native';
import jsQR from 'jsqr';
import { Button, Text } from '@/components/ui';
import { parseInvite } from './parseInvite';

function Camera({
  onScan,
  onClose,
}: {
  onScan: (credential: string) => void;
  onClose: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [retry, setRetry] = useState(0);
  const accepted = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const currentScan = useRef(onScan);
  useEffect(() => {
    currentScan.current = onScan;
  }, [onScan]);
  useEffect(() => {
    let disposed = false;
    let stream: MediaStream | null = null;
    let frame = 0;
    let last = 0;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    const player = video.current;
    function finish(raw: string) {
      const credential = parseInvite(raw, window.location.origin);
      if (!credential) {
        setError('Este QR Code não é um convite válido do Fitto.');
        return false;
      }
      if (!accepted.current) {
        accepted.current = true;
        currentScan.current(credential);
      }
      return true;
    }
    function tick(time: number) {
      if (disposed || accepted.current) return;
      if (player && context && player.readyState >= 2 && player.videoWidth && time - last > 200) {
        last = time;
        canvas.width = Math.min(player.videoWidth, 720);
        canvas.height = Math.round(player.videoHeight * (canvas.width / player.videoWidth));
        try {
          context.drawImage(player, 0, 0, canvas.width, canvas.height);
          const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
          const result = jsQR(pixels.data, pixels.width, pixels.height, {
            inversionAttempts: 'dontInvert',
          });
          if (result && finish(result.data)) return;
        } catch {
          /* Wait for the next complete camera frame. */
        }
      }
      frame = requestAnimationFrame(tick);
    }
    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported');
        const next = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        if (disposed) {
          next.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = next;
        if (!player) throw new Error('video');
        player.srcObject = stream;
        await player.play();
        if (disposed) return;
        setReady(true);
        setError('');
        frame = requestAnimationFrame(tick);
      } catch (e) {
        if (stream) stream.getTracks().forEach((t) => t.stop());
        if (disposed) return;
        const name = e instanceof DOMException ? e.name : '';
        setError(
          name === 'NotAllowedError'
            ? 'A câmera não foi autorizada. Libere a permissão no navegador ou use uma foto do QR Code.'
            : name === 'NotFoundError'
              ? 'Nenhuma câmera foi encontrada. Você pode usar uma foto do QR Code.'
              : 'Não foi possível abrir a câmera. Tente novamente ou use uma foto do QR Code.',
        );
      }
    }
    const stop = () => onClose();
    document.addEventListener('visibilitychange', stopIfHidden);
    function stopIfHidden() {
      if (document.hidden) stop();
    }
    void start();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((t) => t.stop());
      if (player) player.srcObject = null;
      document.removeEventListener('visibilitychange', stopIfHidden);
    };
  }, [retry, onClose]);
  async function readPhoto(selected: File) {
    if (!selected.type.startsWith('image/') || selected.size > 10 * 1024 * 1024) {
      setError('Escolha uma imagem do QR Code de até 10 MB.');
      return;
    }
    const url = URL.createObjectURL(selected);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      if (!alive.current) return;
      const canvas = document.createElement('canvas');
      const ratio = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.round(image.naturalWidth * ratio);
      canvas.height = Math.round(image.naturalHeight * ratio);
      const context = canvas.getContext('2d');
      if (!context) throw new Error();
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
      const result = jsQR(pixels.data, pixels.width, pixels.height);
      const credential = result ? parseInvite(result.data, window.location.origin) : null;
      if (!credential) {
        setError(
          'Não encontrei um convite válido do Fitto na imagem. Aproxime o QR Code e tente novamente.',
        );
        return;
      }
      if (!accepted.current) {
        accepted.current = true;
        currentScan.current(credential);
      }
    } catch {
      setError('Não foi possível ler a imagem. Tente uma foto mais nítida.');
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  return (
    <ScrollView
      contentContainerStyle={{ padding: 20, gap: 14 }}
      style={{
        width: '100%',
        maxWidth: 480,
        maxHeight: '95%',
        borderRadius: 22,
        backgroundColor: '#191E16',
      }}
    >
      <Text variant="title">Ler QR Code</Text>
      <Text variant="caption">
        Aponte para o convite do profissional. A câmera é usada somente para leitura; nenhuma imagem
        é enviada.
      </Text>
      <video
        ref={video}
        autoPlay
        muted
        playsInline
        aria-label="Câmera para leitura do QR Code"
        style={{
          width: '100%',
          maxHeight: 300,
          aspectRatio: '4/3',
          objectFit: 'cover',
          backgroundColor: '#000',
          borderRadius: 14,
        }}
      />
      {error ? (
        <Text accessibilityRole="alert" color="#FF6B5A">
          {error}
        </Text>
      ) : (
        <Text>
          {ready
            ? 'Mantenha o QR Code visível e bem iluminado.'
            : 'Aguardando permissão da câmera...'}
        </Text>
      )}
      <input
        ref={file}
        type="file"
        accept="image/*"
        capture="environment"
        aria-label="Selecionar ou fotografar QR Code"
        style={{ display: 'none' }}
        onChange={(e) => {
          const selected = e.target.files?.[0];
          e.target.value = '';
          if (selected) void readPhoto(selected);
        }}
      />
      <Button
        title="Fotografar ou escolher imagem"
        variant="outline"
        onPress={() => file.current?.click()}
      />
      {error ? (
        <Button
          title="Tentar câmera novamente"
          variant="ghost"
          onPress={() => {
            setReady(false);
            setError('');
            setRetry((r) => r + 1);
          }}
        />
      ) : null}
      <Button title="Fechar câmera" variant="outline" onPress={onClose} />
    </ScrollView>
  );
}
export function QrScanner({
  disabled = false,
  onScan,
}: {
  disabled?: boolean;
  onScan: (credential: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const close = React.useCallback(() => setOpen(false), []);
  return (
    <>
      <Button
        title="Ler QR Code com a câmera"
        disabled={disabled}
        variant="outline"
        onPress={() => setOpen(true)}
      />
      {open ? (
        <Modal visible transparent animationType="fade" onRequestClose={close}>
          <View
            style={{
              flex: 1,
              padding: 20,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'rgba(0,0,0,0.85)',
            }}
          >
            <Camera
              onClose={close}
              onScan={(credential) => {
                close();
                onScan(credential);
              }}
            />
          </View>
        </Modal>
      ) : null}
    </>
  );
}
