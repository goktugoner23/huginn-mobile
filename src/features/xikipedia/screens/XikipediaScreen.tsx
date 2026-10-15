/**
 * Xikipedia — Wikipedia as a discovery feed.
 *
 * Mobile port of huginn-webapp's xikipedia module. The feed engine
 * (`services/feed-engine.ts`) is the web file copied verbatim — it is pure, so
 * the scoring, the 40/42/18 pick split and the seen-penalty behave identically.
 * What differs is shape: the web page scrolls one tall card and advances on
 * overscroll, while this is a full-screen vertical pager, which is the same
 * gesture on a phone.
 *
 * Engagement maps to the same scores as web: swiping past a post is a scroll,
 * tapping the title or "Read on Wikipedia" is an article click, tapping the
 * image is an image click, and the heart is a like.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  useWindowDimensions,
  type ViewToken,
} from 'react-native';
import { FlatList } from 'react-native';
import { ExternalLink, Heart } from 'lucide-react-native';
import { Text, Badge, Button } from '@shared/components/ui';
import { useColors, spacing, radius, textStyles } from '@shared/theme';
import type { Post } from '../types';
import {
  FeedEngine,
  CLICK_ARTICLE_SCORE,
  CLICK_IMAGE_SCORE,
  SCROLL_SCORE,
} from '../services/feed-engine';
import { loadCorpus, type CorpusSource } from '../services/corpus';
import { loadProfile, saveProfile } from '../services/profile-storage';

/** Commons filename -> a sized FilePath URL. Same as the web card. */
export function imageUrl(thumb: string): string {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(thumb)}?width=800`;
}

/** Real Simple Wikipedia article URL for a title. */
export function articleUrl(title: string): string {
  return `https://simple.wikipedia.org/wiki/${encodeURIComponent(title)}`;
}

function ArticleCard({
  post,
  liked,
  height,
  onLike,
  onOpenArticle,
  onOpenImage,
}: {
  post: Post;
  liked: boolean;
  height: number;
  onLike: () => void;
  onOpenArticle: () => void;
  onOpenImage: () => void;
}) {
  const colors = useColors();
  const styles = makeStyles(colors);
  const [imgFailed, setImgFailed] = useState(false);
  const hasImage = Boolean(post.thumb) && !imgFailed;

  return (
    <View style={[styles.card, { height }]}>
      {hasImage && post.thumb ? (
        <TouchableOpacity activeOpacity={0.9} onPress={onOpenImage} style={styles.imageWrap}>
          <Image
            source={{ uri: imageUrl(post.thumb) }}
            style={styles.image}
            resizeMode="cover"
            onError={() => setImgFailed(true)}
          />
        </TouchableOpacity>
      ) : null}

      <ScrollView contentContainerStyle={styles.body}>
        <TouchableOpacity onPress={onOpenArticle} style={styles.titleRow} activeOpacity={0.7}>
          <Text style={styles.title}>{post.title}</Text>
          <ExternalLink size={16} color={colors.foregroundMuted} />
        </TouchableOpacity>

        {post.text ? <Text style={styles.snippet}>{post.text}</Text> : null}

        {post.categories.length > 0 ? (
          <View style={styles.categories}>
            {post.categories.slice(0, 8).map((c) => (
              <Badge key={c} variant="outline" size="sm">
                {c}
              </Badge>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.actions}>
        <Button
          variant={liked ? 'primary' : 'outline'}
          size="sm"
          onPress={onLike}
          leftIcon={
            <Heart
              size={16}
              color={liked ? colors.primaryForeground : colors.foreground}
              fill={liked ? colors.primaryForeground : 'transparent'}
            />
          }
        >
          {liked ? 'Liked' : 'Like'}
        </Button>
        <Button variant="ghost" size="sm" onPress={onOpenArticle}>
          Read on Wikipedia
        </Button>
      </View>
    </View>
  );
}

export function XikipediaScreen({ source = 'default' }: { source?: CorpusSource }) {
  const colors = useColors();
  const styles = makeStyles(colors);
  const { height: screenHeight } = useWindowDimensions();

  const [engine, setEngine] = useState<FeedEngine | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [liked, setLiked] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const indexRef = useRef(0);

  // Card fills the screen minus the drawer header.
  const cardHeight = screenHeight - 120;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [corpus, profile] = await Promise.all([loadCorpus(source), loadProfile(source)]);
        if (cancelled) return;
        const e = new FeedEngine(corpus, profile);
        const first: Post[] = [];
        for (let i = 0; i < 3; i++) {
          const p = e.nextPost();
          if (p) first.push(p);
        }
        setEngine(e);
        setPosts(first);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load the corpus.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [source]);

  const persist = useCallback(
    (e: FeedEngine) => {
      void saveProfile(e.toProfile(), source);
    },
    [source],
  );

  const appendPost = useCallback(() => {
    setPosts((prev) => {
      if (!engine) return prev;
      const next = engine.nextPost();
      return next ? [...prev, next] : prev;
    });
  }, [engine]);

  // Swiping past a post without engaging is the web's scroll action.
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0];
      if (!first || first.index === null) return;
      indexRef.current = first.index;
    },
  ).current;

  const handleScrollPast = useCallback(
    (post: Post) => {
      if (!engine || liked[post.id]) return;
      engine.engagePost(post, SCROLL_SCORE);
      persist(engine);
    },
    [engine, liked, persist],
  );

  const handleLike = useCallback(
    (post: Post) => {
      if (!engine) return;
      engine.like(post);
      setLiked((prev) => ({ ...prev, [post.id]: true }));
      persist(engine);
    },
    [engine, persist],
  );

  const handleOpenArticle = useCallback(
    (post: Post) => {
      if (engine) {
        engine.engagePost(post, CLICK_ARTICLE_SCORE);
        persist(engine);
      }
      void Linking.openURL(articleUrl(post.title));
    },
    [engine, persist],
  );

  const handleOpenImage = useCallback(
    (post: Post) => {
      if (engine) {
        engine.engagePost(post, CLICK_IMAGE_SCORE);
        persist(engine);
      }
      if (post.thumb) void Linking.openURL(imageUrl(post.thumb));
    },
    [engine, persist],
  );

  const viewabilityConfig = useMemo(() => ({ itemVisiblePercentThreshold: 60 }), []);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!engine) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.subtle}>Loading the corpus…</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.screen}
      data={posts}
      keyExtractor={(p, i) => `${p.id}-${i}`}
      pagingEnabled
      showsVerticalScrollIndicator={false}
      snapToInterval={cardHeight}
      decelerationRate="fast"
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig}
      onEndReachedThreshold={0.6}
      onEndReached={appendPost}
      onMomentumScrollEnd={() => {
        const passed = posts[indexRef.current - 1];
        if (passed) handleScrollPast(passed);
        if (indexRef.current >= posts.length - 2) appendPost();
      }}
      renderItem={({ item }) => (
        <ArticleCard
          post={item}
          liked={Boolean(liked[item.id])}
          height={cardHeight}
          onLike={() => handleLike(item)}
          onOpenArticle={() => handleOpenArticle(item)}
          onOpenImage={() => handleOpenImage(item)}
        />
      )}
    />
  );
}

/** CS/math corpus — same screen, different corpus, separate learned profile. */
export function XikipediaCsScreen() {
  return <XikipediaScreen source="cs" />;
}

export default XikipediaScreen;

const makeStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[2] },
    card: {
      backgroundColor: colors.card,
      borderRadius: radius.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      margin: spacing[3],
      overflow: 'hidden',
    },
    imageWrap: { width: '100%', aspectRatio: 16 / 9, backgroundColor: colors.surfaceHover },
    image: { width: '100%', height: '100%' },
    body: { padding: spacing[4], gap: spacing[3] },
    titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2] },
    title: { ...textStyles.h2, color: colors.foreground, flex: 1 },
    snippet: { ...textStyles.body, color: colors.foregroundMuted },
    categories: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1] },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing[2],
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    subtle: { ...textStyles.caption, color: colors.foregroundMuted },
    errorText: { ...textStyles.caption, color: colors.destructive, textAlign: 'center', padding: spacing[4] },
  });
