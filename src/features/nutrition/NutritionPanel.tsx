import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Button, Text } from '@/components/ui';
import { DetailsPanel } from '@/features/relationships/DetailsPanel';
import { nutritionApi } from './nutritionApi';
import {
  NutritionContent,
  NutritionData,
  NutritionPlan,
  Meal,
  MealStatus,
  MealEntry,
  emptyNutrition,
  nutritionDay,
  mealStatusLabels,
  recentMealEntries,
} from './nutritionModel';
import { NutritionEditor } from './NutritionEditor';
import { NutritionDayView } from './NutritionDayView';

export function NutritionPanel({
  profileId,
  linkId,
  professional = false,
  onBusy,
  startEditing = false,
}: {
  profileId: string;
  linkId: string;
  professional?: boolean;
  startEditing?: boolean;
  onBusy?: (busy: boolean) => void;
}) {
  const [data, setData] = useState<NutritionData>({ plan: null, entries: [] }),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [editing, setEditing] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [confirmWithdraw, setConfirmWithdraw] = useState(false),
    [day, setDay] = useState(() => nutritionDay());
  const alive = useRef(true),
    lock = useRef(false),
    planRef = useRef<NutritionPlan | null>(null);
  useEffect(() => {
    onBusy?.(busy || editing);
  }, [busy, editing, onBusy]);
  useEffect(() => {
    const timer = setInterval(() => setDay(nutritionDay()), 60000);
    return () => clearInterval(timer);
  }, []);
  async function refresh() {
    const result = await nutritionApi<NutritionData>(profileId, linkId, 'read');
    if (alive.current) {
      planRef.current = result.plan;
      setData(result);
      setLoading(false);
      if (professional && startEditing) setEditing(true);
      setError('');
    }
  }
  useEffect(() => {
    alive.current = true;
    void refresh().catch((e) => {
      if (alive.current) {
        setError(e.message);
        setLoading(false);
      }
    });
    return () => {
      alive.current = false;
    }; /* Each panel belongs to one relationship. */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, linkId]);
  async function run(task: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await task();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  async function save(doc: NutritionContent, publish: boolean) {
    if (lock.current) throw new Error('Aguarde a operação atual.');
    lock.current = true;
    setBusy(true);
    try {
      let plan = await nutritionApi<NutritionPlan>(profileId, linkId, 'save', {
        content: doc,
        version: planRef.current?.version || 0,
      });
      planRef.current = plan;
      setData((d) => ({ ...d, plan }));
      if (publish) {
        plan = await nutritionApi<NutritionPlan>(profileId, linkId, 'publish', {
          version: plan.version,
        });
        planRef.current = plan;
        setData((d) => ({ ...d, plan }));
      }
      setNotice(publish ? 'Plano publicado para o aluno.' : 'Rascunho salvo.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function log(meal: Meal, status: MealStatus, note: string) {
    await run(async () => {
      const version = planRef.current?.published_version;
      if (!version) throw new Error('Atualize o plano antes de registrar.');
      const entry = data.entries.find(
        (e) => e.day === day && e.meal_id === meal.id && e.plan_version === version,
      );
      const saved = await nutritionApi<MealEntry>(profileId, linkId, 'log', {
        plan_version: version,
        meal_id: meal.id,
        day,
        status,
        note,
        entry_version: entry?.version || 0,
      });
      setData((d) => ({ ...d, entries: [...d.entries.filter((e) => e.id !== saved.id), saved] }));
      setNotice('Registro da refeição salvo.');
    });
  }
  const plan = data.plan,
    published = plan?.published;
  const history = recentMealEntries(data.entries, day);
  const entries = data.entries.filter((e) => e.plan_version === plan?.published_version);
  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 26, fontWeight: '700' }}>Alimentação</Text>
        <Text variant="caption">
          {professional
            ? 'Planeje as refeições e acompanhe os registros do aluno.'
            : 'Seu plano alimentar, organizado por refeição.'}
        </Text>
      </View>
      {error ? (
        <Text accessibilityRole="alert" color="#FFB87A">
          {error}
        </Text>
      ) : null}
      {notice ? (
        <Text accessibilityLiveRegion="polite" color="#C0F568">
          {notice}
        </Text>
      ) : null}
      {loading ? (
        <Text>Carregando alimentação…</Text>
      ) : (
        <>
          {professional ? (
            <View style={{ padding: 16, gap: 12, borderRadius: 18, backgroundColor: '#202D19' }}>
              <Text variant="title">{plan?.draft?.title || 'Comece o plano alimentar'}</Text>
              <Text variant="caption">
                {published
                  ? 'Há uma versão publicada para o aluno. Salvar um rascunho não altera essa versão.'
                  : 'O aluno ainda não recebeu um plano publicado.'}
              </Text>
              <Button
                title={plan ? 'Editar rascunho' : 'Criar plano alimentar'}
                disabled={busy}
                onPress={() => setEditing(true)}
              />
              {published ? (
                <Button
                  title="Retirar plano de publicação"
                  variant="ghost"
                  disabled={busy}
                  onPress={() => setConfirmWithdraw(true)}
                />
              ) : null}
            </View>
          ) : null}
          {confirmWithdraw ? (
            <View style={{ gap: 10, padding: 16, backgroundColor: '#382C19', borderRadius: 16 }}>
              <Text>
                Retirar o plano da visualização do aluno? O rascunho e os registros serão
                preservados.
              </Text>
              <Button
                title="Manter publicado"
                disabled={busy}
                onPress={() => setConfirmWithdraw(false)}
              />
              <Button
                title="Confirmar retirada"
                variant="outline"
                disabled={busy}
                onPress={() =>
                  void run(async () => {
                    const next = await nutritionApi<NutritionPlan>(profileId, linkId, 'unpublish', {
                      version: planRef.current?.version,
                    });
                    planRef.current = next;
                    setData((d) => ({ ...d, plan: next }));
                    setConfirmWithdraw(false);
                    setNotice('Plano retirado de publicação.');
                  })
                }
              />
            </View>
          ) : null}
          <Text variant="caption">
            HOJE · {new Date(day + 'T12:00:00').toLocaleDateString('pt-BR')}
          </Text>
          {published ? (
            <NutritionDayView
              content={published}
              entries={entries}
              day={day}
              busy={busy}
              readOnly={professional}
              onLog={log}
            />
          ) : (
            <View style={{ padding: 24, gap: 8, borderRadius: 20, backgroundColor: '#182215' }}>
              <Text variant="title">
                {professional
                  ? 'Pronto para organizar as refeições?'
                  : 'Seu plano está sendo preparado'}
              </Text>
              <Text variant="caption">
                {professional
                  ? 'Adicione alimentos, quantidades e substituições; revise e publique quando estiver pronto.'
                  : 'Quando seu nutricionista publicar o plano, as refeições aparecerão aqui.'}
              </Text>
            </View>
          )}
          <DetailsPanel title="Registros dos últimos sete dias">
            {history.length ? (
              history.map((e) => (
                <View
                  key={e.id}
                  style={{ padding: 12, gap: 5, borderRadius: 12, backgroundColor: '#1A2515' }}
                >
                  <Text>
                    {e.meal_snapshot.name} · {mealStatusLabels[e.status]}
                  </Text>
                  <Text variant="caption">
                    {new Date(e.day + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </Text>
                  {e.note ? <Text variant="caption">{e.note}</Text> : null}
                </View>
              ))
            ) : (
              <Text variant="caption">Ainda não há registros de refeições.</Text>
            )}
          </DetailsPanel>
        </>
      )}
      <Button
        title="Atualizar alimentação"
        variant="outline"
        disabled={busy || editing}
        onPress={() => void run(refresh)}
      />
      {editing && professional ? (
        <NutritionEditor
          profileId={profileId}
          initial={plan?.draft || emptyNutrition()}
          busy={busy}
          onSave={save}
          onClose={() => setEditing(false)}
        />
      ) : null}
    </View>
  );
}
