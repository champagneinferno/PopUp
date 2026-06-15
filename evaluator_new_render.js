function renderEvaluatorData(data, label) {
            var container = document.getElementById('viewerContent');

            // Check if it's valid evaluator output
            if (!data.scene_metadata && !data['3d_objects']) {
                container.innerHTML = '<div class="empty-state"><h2>Invalid Format</h2><p>This doesn\'t look like evaluator output (3d_scene_blueprint.json)</p></div>';
                return;
            }

            var metadata = data.scene_metadata || {};
            var objects = data['3d_objects'] || [];
            var environment = data.environment || {};
            var thoughtProcess = data['_thought_process'] || {};
            var sourceAssets = data['_source_assets'] || {};

            var html = '';

            // ===== THOUGHT PROCESS SECTION =====
            if (thoughtProcess.focal_point || thoughtProcess.theme || thoughtProcess.style_decision) {
                html += '<div class="thought-section">';
                html += '<h3>🧠 EVALUATOR THOUGHT PROCESS</h3>';

                html += '<div class="thought-grid">';

                // Focal point
                html += '<div class="thought-card">';
                html += '<div class="thought-label">🎯 Focal Point</div>';
                html += '<div class="thought-value highlight">' + (thoughtProcess.focal_point?.value || metadata.focal_point || 'Unknown') + '</div>';
                var fpSource = thoughtProcess.focal_point?.source || 'extracted from site';
                html += '<div class="thought-desc">Source: ' + fpSource + '</div>';
                if (thoughtProcess.focal_point?.rationale) {
                    html += '<div class="thought-desc" style="margin-top: 4px; font-style: italic;">' + thoughtProcess.focal_point.rationale + '</div>';
                }
                html += '</div>';

                // Theme
                html += '<div class="thought-card">';
                html += '<div class="thought-label">📂 Theme Classification</div>';
                html += '<div class="thought-value highlight">' + (thoughtProcess.theme?.value || metadata.theme || 'generic') + '</div>';
                if (thoughtProcess.theme?.rationale) {
                    html += '<div class="thought-desc" style="margin-top: 4px;">' + thoughtProcess.theme.rationale + '</div>';
                }
                if (thoughtProcess.theme?.matched_keywords && thoughtProcess.theme.matched_keywords.length > 0) {
                    html += '<div class="thought-tags">';
                    thoughtProcess.theme.matched_keywords.forEach(function(kw) {
                        html += '<span class="thought-tag">🔑 ' + (kw.keyword || '') + '</span>';
                    });
                    html += '</div>';
                }
                html += '</div>';

                // 3D Style Decision (full width)
                if (thoughtProcess.style_decision) {
                    html += '<div class="thought-card full-width" style="padding-bottom: 4px;">';
                    html += '<div class="thought-label">🎨 3D Style Decision</div>';
                    html += '<div style="display: flex; align-items: center; gap: 12px; margin-bottom: 6px;">';
                    html += '<span class="thought-value highlight">' + (thoughtProcess.style_decision.style || 'default') + '</span>';
                    html += '<span style="font-size: 11px; color: #888;">Confidence: ' + (thoughtProcess.style_decision.confidence || 0) + '/10</span>';
                    html += '</div>';
                    html += '<div class="style-bar-row">';
                    var maxScore = 10;
                    var allScores = thoughtProcess.style_decision.all_scores || {};
                    var styleColors = {
                        'minimalist': '#94a3b8',
                        'bold-cinematic': '#f59e0b',
                        'tech-corporate': '#3b82f6',
                        'creative-playful': '#ec4899',
                        'dark-moody': '#6366f1'
                    };
                    Object.keys(allScores).forEach(function(styleName) {
                        var score = allScores[styleName] || 0;
                        var pct = Math.min(Math.round((score / maxScore) * 100), 100);
                        var color = styleColors[styleName] || '#888';
                        html += '<div class="style-bar-item">';
                        html += '<span class="style-name">' + styleName + '</span>';
                        html += '<div class="style-bar-track"><div class="style-bar-fill" style="width: ' + pct + '%; background: ' + color + ';"></div></div>';
                        html += '<span class="style-score">' + score + '</span>';
                        html += '</div>';
                    });
                    html += '</div></div>';
                }

                // Complexity analysis
                if (thoughtProcess.complexity_analysis) {
                    var ca = thoughtProcess.complexity_analysis;
                    html += '<div class="thought-card">';
                    html += '<div class="thought-label">📊 Complexity Analysis</div>';
                    html += '<div class="thought-value">' + (ca.level || 'unknown') + '</div>';
                    html += '<div class="thought-desc">Elements: ' + (ca.total_elements || 0) + ' | Multiplier: ' + (ca.multiplier || 1) + 'x</div>';
                    html += '</div>';
                }

                // Color analysis
                if (thoughtProcess.color_analysis) {
                    var ca2 = thoughtProcess.color_analysis;
                    html += '<div class="thought-card">';
                    html += '<div class="thought-label">🎨 Color Analysis</div>';
                    html += '<div class="thought-desc">Explicit: ' + (ca2.explicit_count || 0) + ' colors | Implicit: ' + (ca2.implicit_count || 0) + ' hints</div>';
                    html += '<div class="thought-desc">Background source: ' + (ca2.background_source || 'unknown') + '</div>';
                    if (ca2.explicit_colors && ca2.explicit_colors.length > 0) {
                        html += '<div class="color-swatch-row">';
                        ca2.explicit_colors.slice(0, 8).forEach(function(c) {
                            html += '<span class="color-swatch" style="background: ' + c + ';"></span>';
                        });
                        html += '</div>';
                    }
                    html += '</div>';
                }

                html += '</div></div>';
            }

            // ===== SOURCE ASSETS PREVIEW =====
            var hasAssets = sourceAssets.hero_image || sourceAssets.logo || (sourceAssets.content_images && sourceAssets.content_images.length > 0) || (sourceAssets.background_images && sourceAssets.background_images.length > 0);
            if (hasAssets) {
                html += '<div class="objects-section">';
                html += '<h3>🖼️ SOURCE ASSETS FROM WEBSITE</h3>';
                html += '<div class="asset-preview-grid">';

                if (sourceAssets.logo) {
                    html += '<div class="asset-preview-card featured">';
                    html += '<img src="' + sourceAssets.logo + '" alt="Logo" onerror="this.parentElement.style.display=\'none\'">';
                    html += '<div class="asset-label" style="flex: 1; display: flex; align-items: center; padding: 10px 16px;">🏷️ Logo — brand marker in 3D scene</div>';
                    html += '</div>';
                }

                if (sourceAssets.hero_image) {
                    html += '<div class="asset-preview-card">';
                    html += '<img src="' + sourceAssets.hero_image + '" alt="Hero" onerror="this.style.display=\'none\'">';
                    html += '<div class="asset-label">🎯 Hero Background</div>';
                    html += '</div>';
                }

                if (sourceAssets.content_images) {
                    sourceAssets.content_images.slice(0, 6).forEach(function(img) {
                        html += '<div class="asset-preview-card">';
                        html += '<img src="' + img + '" alt="Content" onerror="this.parentElement.style.display=\'none\'">';
                        html += '<div class="asset-label">📄 Content</div>';
                        html += '</div>';
                    });
                }

                if (sourceAssets.background_images) {
                    sourceAssets.background_images.slice(0, 4).forEach(function(img) {
                        html += '<div class="asset-preview-card">';
                        html += '<img src="' + img + '" alt="Background" onerror="this.parentElement.style.display=\'none\'">';
                        html += '<div class="asset-label">🎨 Background</div>';
                        html += '</div>';
                    });
                }

                html += '</div></div>';
            }

            // ===== EVALUATOR DECISIONS (original metadata) =====
            html += '<div class="decision-panel">';
            html += '<h3>📊 Evaluator Decisions' + (label ? ' — ' + label : '') + '</h3>';

            if (metadata.source_url) {
                html += '<div style="padding: 8px 16px; background: #f0f4ff; font-size: 12px; color: #2563eb; border-bottom: 1px solid #e0e0e0;">Source: ' + metadata.source_url + '</div>';
            }

            html += '<div class="metadata">';
            html += '<div class="meta-item"><div class="meta-label">Focal Point</div><div class="meta-value">' + (metadata.focal_point || 'Not detected') + '</div></div>';
            html += '<div class="meta-item"><div class="meta-label">Theme</div><div class="meta-value">' + (metadata.theme || 'generic') + '</div></div>';
            html += '<div class="meta-item"><div class="meta-label">3D Style</div><div class="meta-value">' + (metadata.style || 'default') + '</div></div>';
            html += '<div class="meta-item"><div class="meta-label">Max 3D Objects</div><div class="meta-value">' + (metadata.max_3d_objects || 0) + '</div></div>';
            html += '<div class="meta-item"><div class="meta-label">Token Cost</div><div class="meta-value">' + (metadata.token_cost_estimate || 0) + '</div></div>';

            if (metadata.token_usage) {
                html += '<div class="meta-item"><div class="meta-label">Complexity</div><div class="meta-value">' + (metadata.token_usage.complexity_multiplier || 1) + 'x</div></div>';
                html += '<div class="meta-item"><div class="meta-label">Decisions Made</div><div class="meta-value">' + (metadata.token_usage.decisions_made || 0) + '</div></div>';
            }
            html += '</div></div>';

            // ===== ENVIRONMENT =====
            if (environment.background || environment.lighting) {
                html += '<div class="decision-panel">';
                html += '<h3>🌍 Environment</h3>';
                html += '<div class="metadata">';

                var bg = environment.background || {};
                html += '<div class="meta-item"><div class="meta-label">Background Type</div><div class="meta-value">' + (bg.type || 'color') + '</div></div>';
                if (bg.source && bg.source.includes('http')) {
                    html += '<div class="meta-item" style="grid-column: 1/-1;"><div class="meta-label">Background Source</div><div class="meta-value" style="font-size: 11px; word-break: break-all;">' + bg.source.substring(0, 100) + '</div></div>';
                }

                var light = environment.lighting || {};
                html += '<div class="meta-item"><div class="meta-label">Lighting</div><div class="meta-value">' + (light.type || 'ambient') + '</div></div>';
                if (light.intensity) html += '<div class="meta-item"><div class="meta-label">Light Intensity</div><div class="meta-value">' + light.intensity + '</div></div>';

                html += '</div></div>';
            }

            // ===== 3D OBJECTS WITH RATIONALE =====
            html += '<div class="objects-section">';
            html += '<h3>🎨 3D Objects (' + objects.length + ')</h3>';

            var rationaleList = thoughtProcess.objects_rationale || [];
            var summaryItem = null;
            if (rationaleList.length > 0) {
                summaryItem = rationaleList[rationaleList.length - 1];
                if (summaryItem && summaryItem.summary) {
                    html += '<div class="rationale-summary">';
                    html += '📋 <strong>' + summaryItem.summary + '</strong>';
                    if (summaryItem.theme_limit) html += ' — ' + summaryItem.theme_limit;
                    html += '</div>';
                } else {
                    summaryItem = null;
                }
            }

            if (objects.length > 0) {
                objects.forEach(function(obj, idx) {
                    var priority = obj.priority || 'medium';
                    var objRationale = rationaleList[idx] || {};

                    html += '<div class="rationale-card ' + priority + '-priority">';

                    html += '<div class="rationale-type">';
                    html += getObjectIcon(obj.type) + ' ' + (obj.type || 'unknown');
                    if (objRationale.source_from) {
                        html += ' <span class="rationale-source">from ' + objRationale.source_from + '</span>';
                    }
                    html += '</div>';

                    var content = obj.content || obj.text || obj.heading || obj.preview || '';
                    if (content) {
                        html += '<div class="rationale-content">' + escapeHtml(String(content).substring(0, 150)) + '</div>';
                    }

                    if (objRationale.reasoning) {
                        html += '<div class="rationale-reasoning">💡 <strong>Why:</strong> ' + objRationale.reasoning + '</div>';
                    } else if (obj.reason) {
                        html += '<div class="rationale-reasoning">💡 <strong>Why:</strong> ' + obj.reason + '</div>';
                    }

                    if (objRationale['3d_representation']) {
                        html += '<div class="rationale-3d">🎬 ' + objRationale['3d_representation'] + '</div>';
                    }

                    html += '<div style="margin-top: 6px; font-size: 10px; color: #aaa;">';
                    html += 'Priority: ' + obj.priority;
                    if (obj.position) {
                        html += ' | Position: ' + JSON.stringify(obj.position);
                    }
                    if (obj.scale) {
                        html += ' | Scale: ' + obj.scale;
                    }
                    html += '</div>';

                    html += '</div>';
                });
            } else {
                html += '<div style="padding: 20px; text-align: center; color: #888;">No 3D objects decided yet</div>';
            }

            html += '<div class="raw-toggle" onclick="var r=this.nextElementSibling;r.classList.toggle(\'show\');this.textContent=r.classList.contains(\'show\')?\'Hide Raw JSON\':\'Show Raw JSON\'">Show Raw JSON</div>';
            html += '<div class="raw-json"><pre>' + JSON.stringify(data, null, 2) + '</pre></div>';

            html += '</div>';

            container.innerHTML = html;
        }

        function getObjectIcon(type) {
            var icons = {
                'hero_text': '🏆',
                'cta_button': '🔘',
                'content_panel': '📄',
                'sketchfab_asset': '🧊',
                'image': '🖼️',
                'logo': '🏷️'
            };
            return icons[type] || '🔷';
        }

        function escapeHtml(str) {
            var div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }